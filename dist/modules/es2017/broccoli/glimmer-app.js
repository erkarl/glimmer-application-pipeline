import defaultsDeep from 'lodash.defaultsdeep';
import ConfigLoader from 'broccoli-config-loader';
import ConfigReplace from 'broccoli-config-replace';
import Funnel from 'broccoli-funnel';
import concat from 'broccoli-concat';
import * as path from 'path';
import * as fs from 'fs';
import { typescript } from 'broccoli-typescript-compiler';
import existsSync from 'exists-sync';
import merge from 'broccoli-merge-trees';
import compileSass from 'broccoli-sass';
import uglify from 'broccoli-uglify-sourcemap';
import ResolutionMapBuilder from '@glimmer/resolution-map-builder';
import ResolverConfigurationBuilder from '@glimmer/resolver-configuration-builder';
import RollupWithDependencies from './rollup-with-dependencies';
import GlimmerTemplatePrecompiler from './glimmer-template-precompiler';
import defaultModuleConfiguration from './default-module-configuration';
import { WatchedDir, UnwatchedDir } from 'broccoli-source';
import Logger from 'heimdalljs-logger';
const logger = Logger('@glimmer/application-pipeline:glimmer-app');
import stew from 'broccoli-stew';
const mv = stew.mv;
const find = stew.find;
const map = stew.map;
const DEFAULT_CONFIG = {
    outputPaths: {
        app: {
            html: 'index.html'
        }
    },
    configPath: './config/environment',
    trees: {
        app: 'src',
        styles: 'src/ui/styles'
    },
    jshintrc: {
        tests: 'tests',
        app: 'src'
    }
};
const DEFAULT_TS_OPTIONS = {
    tsconfig: {
        compilerOptions: {
            target: "es5",
            module: "es2015",
            inlineSourceMap: true,
            inlineSources: true,
            moduleResolution: "node"
        },
        exclude: [
            'node_modules',
            '**/*.d.ts'
        ]
    }
};
/**
 * GlimmerApp provides an interface to a package (app, engine, or addon)
 * compatible with the module unification layout.
 *
 * @class GlimmerApp
 * @constructor
 * @param {Object} [defaults]
 * @param {Object} [options={}] Configuration options
 */
export default class GlimmerApp {
    constructor(defaults, options) {
        if (arguments.length === 0) {
            options = {};
        }
        else if (arguments.length === 1) {
            options = defaults;
        }
        else {
            defaultsDeep(options, defaults);
        }
        options = this.options = defaultsDeep(options, DEFAULT_CONFIG);
        this.env = process.env.EMBER_ENV || 'development';
        this.project = options.project;
        this.name = options.name || this.project.name();
        this.trees = this.buildTrees();
        let srcPath = options.srcPath || 'src';
        this.srcPath = this.resolveLocal(srcPath);
    }
    _configReplacePatterns() {
        return [{
                match: /\{\{rootURL\}\}/g,
                replacement: () => '',
            }, {
                match: /\{\{content-for ['"](.+)["']\}\}/g,
                replacement: this.contentFor.bind(this)
            }];
    }
    buildTrees() {
        const srcPath = this.resolveLocal('src');
        const srcTree = existsSync(srcPath) ? new WatchedDir(srcPath) : null;
        const nodeModulesTree = new Funnel(new UnwatchedDir(this.project.root), {
            srcDir: 'node_modules/@glimmer',
            destDir: 'node_modules/@glimmer',
            include: [
                '**/*.d.ts',
                '**/package.json'
            ]
        });
        return {
            srcTree,
            nodeModulesTree
        };
    }
    resolveLocal(to) {
        return path.join(this.project.root, to);
    }
    tsOptions() {
        let tsconfigPath = this.resolveLocal('tsconfig.json');
        let tsconfig;
        if (existsSync(tsconfigPath)) {
            try {
                tsconfig = require(tsconfigPath);
            }
            catch (err) {
                console.log("Error reading from tsconfig.json");
            }
        }
        else {
            console.log("No tsconfig.json found; falling back to default TypeScript settings.");
        }
        return tsconfig ? { tsconfig } : DEFAULT_TS_OPTIONS;
    }
    /**
     * Creates a Broccoli tree representing the compiled Glimmer application.
     *
     * @param options
     */
    toTree(options) {
        let isProduction = process.env.EMBER_ENV === 'production';
        let jsTree = this.javascriptTree();
        let cssTree = this.cssTree();
        let publicTree = this.publicTree();
        let htmlTree = this.htmlTree();
        // Minify the JavaScript in production builds.
        if (isProduction) {
            jsTree = this.minifyTree(jsTree);
        }
        let trees = [jsTree, htmlTree];
        if (cssTree) {
            trees.push(cssTree);
        }
        if (publicTree) {
            trees.push(publicTree);
        }
        let appTree = merge(trees);
        // Fingerprint assets for cache busting in production.
        /*
         Disable asset-rev until it's possible to generate asset-map
         in Glimmer apps.
        if (isProduction) {
          let extensions = ['js', 'css'];
          let replaceExtensions = ['html', 'js', 'css'];
          let exclude = ['sw.js', 'web-animations.min.js'];
    
          appTree = assetRev(appTree, {
            enabled: false,
            exclude,
            extensions,
            replaceExtensions
          });
        }
        */
        return appTree;
    }
    javascriptTree() {
        let { srcTree, nodeModulesTree } = this.trees;
        // Grab the app's `src` directory.
        srcTree = find(srcTree, {
            destDir: 'src'
        });
        // Compile the TypeScript and Handlebars files into JavaScript
        const compiledHandlebarsTree = this.compiledHandlebarsTree(srcTree);
        const compiledTypeScriptTree = this.compiledTypeScriptTree(srcTree, nodeModulesTree);
        // Remove top-most `src` directory so module names don't include it.
        const resolvableTree = find(merge([compiledTypeScriptTree, compiledHandlebarsTree]), {
            srcDir: 'src'
        });
        // Build the file that maps individual modules onto the resolver's specifier
        // keys.
        const moduleMap = this.buildResolutionMap(resolvableTree);
        // Build the resolver configuration file.
        const resolverConfiguration = this.buildResolverConfiguration();
        // Merge the JavaScript source and generated module map and resolver
        // configuration files together, making sure to overwrite the stub
        // module-map.js and resolver-configuration.js in the source tree with the
        // generated ones.
        let jsTree = merge([
            resolvableTree,
            moduleMap,
            resolverConfiguration
        ], { overwrite: true });
        // Finally, bundle the app into a single rolled up .js file.
        return this.rollupTree(jsTree);
    }
    compiledTypeScriptTree(srcTree, nodeModulesTree) {
        const tsOptions = this.tsOptions();
        let inputTrees = merge([nodeModulesTree, srcTree]);
        return typescript(inputTrees, tsOptions);
    }
    compiledHandlebarsTree(srcTree) {
        let hbsTree = find(srcTree, {
            include: ['src/**/*.hbs']
        });
        return new GlimmerTemplatePrecompiler(hbsTree, {
            rootName: this.project.pkg.name
        });
    }
    rollupTree(jsTree) {
        return new RollupWithDependencies(jsTree, {
            inputFiles: ['**/*.js'],
            rollup: {
                format: 'umd',
                entry: 'index.js',
                dest: 'app.js',
                sourceMap: 'inline'
            }
        });
    }
    minifyTree(jsTree) {
        return uglify(jsTree, {
            compress: {
                screw_ie8: true,
            },
            sourceMapConfig: {
                enabled: false
            }
        });
    }
    rewriteConfigEnvironment(src) {
        return new ConfigReplace(src, this._configTree(), {
            configPath: this._configPath(),
            files: ['config/environment.js'],
            patterns: this._configReplacePatterns()
        });
    }
    buildResolutionMap(src) {
        src = find(src, {
            exclude: ['config/**/*']
        });
        return new ResolutionMapBuilder(src, this._configTree(), {
            configPath: this._configPath(),
            defaultModulePrefix: this.name,
            defaultModuleConfiguration
        });
    }
    buildResolverConfiguration() {
        return new ResolverConfigurationBuilder(this._configTree(), {
            configPath: this._configPath(),
            defaultModulePrefix: this.name,
            defaultModuleConfiguration
        });
    }
    cssTree() {
        let stylesPath = path.join(this.srcPath, 'ui', 'styles');
        if (fs.existsSync(stylesPath)) {
            // Compile SASS if app.scss is present
            // (this works with imports from app.scss)
            let scssPath = path.join(stylesPath, 'app.scss');
            if (fs.existsSync(scssPath)) {
                return compileSass([stylesPath], 'app.scss', 'app.css', {
                    annotation: 'Funnel: scss'
                });
            }
            // Otherwise concat all the css in the styles dir
            return concat(new Funnel(stylesPath, {
                include: ['**/*.css'],
                annotation: 'Funnel: css'
            }), { outputFile: 'app.css' });
        }
    }
    publicTree() {
        let publicPath = 'public';
        if (fs.existsSync(publicPath)) {
            return new Funnel(publicPath, {
                annotation: 'Funnel: public'
            });
        }
    }
    htmlTree() {
        let srcTree = this.trees.srcTree;
        const htmlName = this.options.outputPaths.app.html;
        const files = [
            'ui/index.html'
        ];
        const index = new Funnel(srcTree, {
            files,
            getDestinationPath(relativePath) {
                if (relativePath === 'ui/index.html') {
                    relativePath = htmlName;
                }
                return relativePath;
            },
            annotation: 'Funnel: index.html'
        });
        return new ConfigReplace(index, this._configTree(), {
            configPath: this._configPath(),
            files: [htmlName],
            patterns: this._configReplacePatterns()
        });
    }
    contentFor(config, match, type) {
        let content = [];
        switch (type) {
            case 'head':
                this._contentForHead(content, config);
                break;
        }
        content = this.project.addons.reduce(function (content, addon) {
            var addonContent = addon.contentFor ? addon.contentFor(type, config, content) : null;
            if (addonContent) {
                return content.concat(addonContent);
            }
            return content;
        }, content);
        return content.join('\n');
    }
    _contentForHead(content, config) {
        // TODO?
        // content.push(calculateBaseTag(config));
        // TODO?
        // if (this.options.storeConfigInMeta) {
        //   content.push('<meta name="' + config.modulePrefix + '/config/environment" ' +
        //               'content="' + escape(JSON.stringify(config)) + '" />');
        // }
    }
    _configPath() {
        return path.join(this.name, 'config', 'environments', this.env + '.json');
    }
    _configTree() {
        if (this._cachedConfigTree) {
            return this._cachedConfigTree;
        }
        const configPath = this.project.configPath();
        const configTree = new ConfigLoader(path.dirname(configPath), {
            env: this.env,
            project: this.project
        });
        this._cachedConfigTree = new Funnel(configTree, {
            srcDir: '/',
            destDir: this.name + '/config',
            annotation: 'Funnel (config)'
        });
        return this._cachedConfigTree;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xpbW1lci1hcHAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYnJvY2NvbGkvZ2xpbW1lci1hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxZQUFZLE1BQU0scUJBQXFCLENBQUM7QUFFL0MsT0FBTyxZQUFZLE1BQU0sd0JBQXdCLENBQUM7QUFDbEQsT0FBTyxhQUFhLE1BQU0seUJBQXlCLENBQUM7QUFFcEQsT0FBTyxNQUFNLE1BQU0saUJBQWlCLENBQUM7QUFDckMsT0FBTyxNQUFNLE1BQU0saUJBQWlCLENBQUM7QUFDckMsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzFELE9BQU8sVUFBVSxNQUFNLGFBQWEsQ0FBQztBQUNyQyxPQUFPLEtBQUssTUFBTSxzQkFBc0IsQ0FBQztBQUN6QyxPQUFPLFdBQVcsTUFBTSxlQUFlLENBQUM7QUFFeEMsT0FBTyxNQUFNLE1BQU0sMkJBQTJCLENBQUM7QUFDL0MsT0FBTyxvQkFBb0IsTUFBTSxpQ0FBaUMsQ0FBQztBQUNuRSxPQUFPLDRCQUE0QixNQUFNLHlDQUF5QyxDQUFDO0FBQ25GLE9BQU8sc0JBQXNCLE1BQU0sNEJBQTRCLENBQUM7QUFDaEUsT0FBTywwQkFBMEIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RSxPQUFPLDBCQUEwQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFM0QsT0FBTyxNQUFNLE1BQU0sbUJBQW1CLENBQUM7QUFDdkMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLDJDQUEyQyxDQUFDLENBQUM7QUFFbkUsT0FBTyxJQUFJLE1BQU0sZUFBZSxDQUFDO0FBRWpDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDbkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztBQUN2QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBRXJCLE1BQU0sY0FBYyxHQUFHO0lBQ3JCLFdBQVcsRUFBRTtRQUNYLEdBQUcsRUFBRTtZQUNILElBQUksRUFBRSxZQUFZO1NBQ25CO0tBQ0Y7SUFDRCxVQUFVLEVBQUUsc0JBQXNCO0lBQ2xDLEtBQUssRUFBRTtRQUNMLEdBQUcsRUFBRSxLQUFLO1FBQ1YsTUFBTSxFQUFFLGVBQWU7S0FDeEI7SUFDRCxRQUFRLEVBQUU7UUFDUixLQUFLLEVBQUUsT0FBTztRQUNkLEdBQUcsRUFBRSxLQUFLO0tBQ1g7Q0FDRixDQUFDO0FBRUYsTUFBTSxrQkFBa0IsR0FBRztJQUN6QixRQUFRLEVBQUU7UUFDUixlQUFlLEVBQUU7WUFDZixNQUFNLEVBQUUsS0FBSztZQUNiLE1BQU0sRUFBRSxRQUFRO1lBQ2hCLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLGFBQWEsRUFBRSxJQUFJO1lBQ25CLGdCQUFnQixFQUFFLE1BQU07U0FDekI7UUFDRCxPQUFPLEVBQUU7WUFDUCxjQUFjO1lBQ2QsV0FBVztTQUNaO0tBQ0Y7Q0FDRixDQUFDO0FBOEJGOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxDQUFDLE9BQU87SUFTWixZQUFZLFFBQVEsRUFBRSxPQUFPO1FBQzNCLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2YsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEMsT0FBTyxHQUFHLFFBQVEsQ0FBQztRQUNyQixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixZQUFZLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFFRCxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRS9ELElBQUksQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLElBQUksYUFBYSxDQUFDO1FBQ2xELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztRQUMvQixJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNoRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUUvQixJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQztRQUN2QyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELHNCQUFzQjtRQUNwQixNQUFNLENBQUMsQ0FBQztnQkFDTixLQUFLLEVBQUUsa0JBQWtCO2dCQUN6QixXQUFXLEVBQUUsTUFBTSxFQUFFO2FBQ3RCLEVBQUU7Z0JBQ0QsS0FBSyxFQUFFLG1DQUFtQztnQkFDMUMsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQzthQUN4QyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsVUFBVTtRQUNSLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekMsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQztRQUVyRSxNQUFNLGVBQWUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3RFLE1BQU0sRUFBRSx1QkFBdUI7WUFDL0IsT0FBTyxFQUFFLHVCQUF1QjtZQUNoQyxPQUFPLEVBQUU7Z0JBQ1AsV0FBVztnQkFDWCxpQkFBaUI7YUFDbEI7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLENBQUM7WUFDTCxPQUFPO1lBQ1AsZUFBZTtTQUNoQixDQUFBO0lBQ0gsQ0FBQztJQUVPLFlBQVksQ0FBQyxFQUFFO1FBQ3JCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTyxTQUFTO1FBQ2YsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUN0RCxJQUFJLFFBQVEsQ0FBQztRQUViLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0IsSUFBSSxDQUFDO2dCQUNILFFBQVEsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDbkMsQ0FBQztZQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1lBQ2xELENBQUM7UUFDSCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixPQUFPLENBQUMsR0FBRyxDQUFDLHNFQUFzRSxDQUFDLENBQUM7UUFDdEYsQ0FBQztRQUVELE1BQU0sQ0FBQyxRQUFRLEdBQUcsRUFBRSxRQUFRLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQztJQUN0RCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxPQUFPO1FBQ1osSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEtBQUssWUFBWSxDQUFDO1FBRTFELElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNuQyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDN0IsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ25DLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUUvQiw4Q0FBOEM7UUFDOUMsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUNqQixNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuQyxDQUFDO1FBRUQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDL0IsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNaLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEIsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDZixLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pCLENBQUM7UUFFRCxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFM0Isc0RBQXNEO1FBQ3REOzs7Ozs7Ozs7Ozs7Ozs7VUFlRTtRQUVGLE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQUVELGNBQWM7UUFDWixJQUFJLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7UUFFOUMsa0NBQWtDO1FBQ2xDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ3RCLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsOERBQThEO1FBQzlELE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUVwRixvRUFBb0U7UUFDcEUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLHNCQUFzQixFQUFFLHNCQUFzQixDQUFDLENBQUMsRUFBRTtZQUNuRixNQUFNLEVBQUUsS0FBSztTQUNkLENBQUMsQ0FBQztRQUVILDRFQUE0RTtRQUM1RSxRQUFRO1FBQ1IsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRTFELHlDQUF5QztRQUN6QyxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1FBRWhFLG9FQUFvRTtRQUNwRSxrRUFBa0U7UUFDbEUsMEVBQTBFO1FBQzFFLGtCQUFrQjtRQUNsQixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUM7WUFDakIsY0FBYztZQUNkLFNBQVM7WUFDVCxxQkFBcUI7U0FDdEIsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRXhCLDREQUE0RDtRQUM1RCxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsc0JBQXNCLENBQUMsT0FBTyxFQUFFLGVBQWU7UUFDN0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRW5DLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQyxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRW5ELE1BQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxPQUFPO1FBQzVCLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDMUIsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDO1NBQzFCLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxJQUFJLDBCQUEwQixDQUFDLE9BQU8sRUFBRTtZQUM3QyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSTtTQUNoQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQU07UUFDZixNQUFNLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxNQUFNLEVBQUU7WUFDeEMsVUFBVSxFQUFFLENBQUMsU0FBUyxDQUFDO1lBQ3ZCLE1BQU0sRUFBRTtnQkFDTixNQUFNLEVBQUUsS0FBSztnQkFDYixLQUFLLEVBQUUsVUFBVTtnQkFDakIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsU0FBUyxFQUFFLFFBQVE7YUFDcEI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQU07UUFDZixNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUNwQixRQUFRLEVBQUU7Z0JBQ1IsU0FBUyxFQUFFLElBQUk7YUFDaEI7WUFDRCxlQUFlLEVBQUU7Z0JBQ2YsT0FBTyxFQUFFLEtBQUs7YUFDZjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxHQUFHO1FBQzFCLE1BQU0sQ0FBQyxJQUFJLGFBQWEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQ2hELFVBQVUsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQzlCLEtBQUssRUFBRSxDQUFFLHVCQUF1QixDQUFFO1lBQ2xDLFFBQVEsRUFBRSxJQUFJLENBQUMsc0JBQXNCLEVBQUU7U0FDeEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELGtCQUFrQixDQUFDLEdBQUc7UUFDcEIsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDZCxPQUFPLEVBQUUsQ0FBQyxhQUFhLENBQUM7U0FDekIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLElBQUksb0JBQW9CLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUN2RCxVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUM5QixtQkFBbUIsRUFBRSxJQUFJLENBQUMsSUFBSTtZQUM5QiwwQkFBMEI7U0FDM0IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELDBCQUEwQjtRQUN4QixNQUFNLENBQUMsSUFBSSw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDMUQsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDOUIsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDOUIsMEJBQTBCO1NBQzNCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxPQUFPO1FBQ0wsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUV6RCxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5QixzQ0FBc0M7WUFDdEMsMENBQTBDO1lBQzFDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2pELEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1QixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRTtvQkFDdEQsVUFBVSxFQUFFLGNBQWM7aUJBQzNCLENBQUMsQ0FBQztZQUNMLENBQUM7WUFFRCxpREFBaUQ7WUFDakQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUU7Z0JBQ25DLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQztnQkFDckIsVUFBVSxFQUFFLGFBQWE7YUFBQyxDQUFDLEVBQzNCLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDL0IsQ0FBQztJQUNILENBQUM7SUFFRCxVQUFVO1FBQ1IsSUFBSSxVQUFVLEdBQUcsUUFBUSxDQUFDO1FBRTFCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUU7Z0JBQzVCLFVBQVUsRUFBRSxnQkFBZ0I7YUFDN0IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7SUFFRCxRQUFRO1FBQ04sSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7UUFFakMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztRQUNuRCxNQUFNLEtBQUssR0FBRztZQUNaLGVBQWU7U0FDaEIsQ0FBQztRQUVGLE1BQU0sS0FBSyxHQUFHLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUNoQyxLQUFLO1lBQ0wsa0JBQWtCLENBQUMsWUFBWTtnQkFDN0IsRUFBRSxDQUFDLENBQUMsWUFBWSxLQUFLLGVBQWUsQ0FBQyxDQUFDLENBQUM7b0JBQ3JDLFlBQVksR0FBRyxRQUFRLENBQUM7Z0JBQzFCLENBQUM7Z0JBQ0QsTUFBTSxDQUFDLFlBQVksQ0FBQztZQUN0QixDQUFDO1lBQ0QsVUFBVSxFQUFFLG9CQUFvQjtTQUNqQyxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsSUFBSSxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUNsRCxVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUM5QixLQUFLLEVBQUUsQ0FBRSxRQUFRLENBQUU7WUFDbkIsUUFBUSxFQUFFLElBQUksQ0FBQyxzQkFBc0IsRUFBRTtTQUN4QyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQU0sRUFBRSxLQUFhLEVBQUUsSUFBWTtRQUM1QyxJQUFJLE9BQU8sR0FBYSxFQUFFLENBQUM7UUFFM0IsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNiLEtBQUssTUFBTTtnQkFDVCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDdEMsS0FBSyxDQUFDO1FBQ1YsQ0FBQztRQUVELE9BQU8sR0FBYSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBUyxPQUFpQixFQUFFLEtBQVk7WUFDckYsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQ3JGLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3RDLENBQUM7WUFFRCxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQ2pCLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVaLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFUyxlQUFlLENBQUMsT0FBaUIsRUFBRSxNQUFNO1FBQ2pELFFBQVE7UUFDUiwwQ0FBMEM7UUFFMUMsUUFBUTtRQUNSLHdDQUF3QztRQUN4QyxrRkFBa0Y7UUFDbEYsd0VBQXdFO1FBQ3hFLElBQUk7SUFDTixDQUFDO0lBRVMsV0FBVztRQUNuQixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBSVMsV0FBVztRQUNuQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1lBQzNCLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7UUFDaEMsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDN0MsTUFBTSxVQUFVLEdBQUcsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUM1RCxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDYixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87U0FDdEIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRTtZQUM5QyxNQUFNLEVBQUUsR0FBRztZQUNYLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLFNBQVM7WUFDOUIsVUFBVSxFQUFFLGlCQUFpQjtTQUM5QixDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO0lBQ2hDLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBkZWZhdWx0c0RlZXAgZnJvbSAnbG9kYXNoLmRlZmF1bHRzZGVlcCc7XG5cbmltcG9ydCBDb25maWdMb2FkZXIgZnJvbSAnYnJvY2NvbGktY29uZmlnLWxvYWRlcic7XG5pbXBvcnQgQ29uZmlnUmVwbGFjZSBmcm9tICdicm9jY29saS1jb25maWctcmVwbGFjZSc7XG5cbmltcG9ydCBGdW5uZWwgZnJvbSAnYnJvY2NvbGktZnVubmVsJztcbmltcG9ydCBjb25jYXQgZnJvbSAnYnJvY2NvbGktY29uY2F0JztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeyB0eXBlc2NyaXB0IH0gZnJvbSAnYnJvY2NvbGktdHlwZXNjcmlwdC1jb21waWxlcic7XG5pbXBvcnQgZXhpc3RzU3luYyBmcm9tICdleGlzdHMtc3luYyc7XG5pbXBvcnQgbWVyZ2UgZnJvbSAnYnJvY2NvbGktbWVyZ2UtdHJlZXMnO1xuaW1wb3J0IGNvbXBpbGVTYXNzIGZyb20gJ2Jyb2Njb2xpLXNhc3MnO1xuaW1wb3J0IGFzc2V0UmV2IGZyb20gJ2Jyb2Njb2xpLWFzc2V0LXJldic7XG5pbXBvcnQgdWdsaWZ5IGZyb20gJ2Jyb2Njb2xpLXVnbGlmeS1zb3VyY2VtYXAnO1xuaW1wb3J0IFJlc29sdXRpb25NYXBCdWlsZGVyIGZyb20gJ0BnbGltbWVyL3Jlc29sdXRpb24tbWFwLWJ1aWxkZXInO1xuaW1wb3J0IFJlc29sdmVyQ29uZmlndXJhdGlvbkJ1aWxkZXIgZnJvbSAnQGdsaW1tZXIvcmVzb2x2ZXItY29uZmlndXJhdGlvbi1idWlsZGVyJztcbmltcG9ydCBSb2xsdXBXaXRoRGVwZW5kZW5jaWVzIGZyb20gJy4vcm9sbHVwLXdpdGgtZGVwZW5kZW5jaWVzJztcbmltcG9ydCBHbGltbWVyVGVtcGxhdGVQcmVjb21waWxlciBmcm9tICcuL2dsaW1tZXItdGVtcGxhdGUtcHJlY29tcGlsZXInO1xuaW1wb3J0IGRlZmF1bHRNb2R1bGVDb25maWd1cmF0aW9uIGZyb20gJy4vZGVmYXVsdC1tb2R1bGUtY29uZmlndXJhdGlvbic7XG5pbXBvcnQgeyBXYXRjaGVkRGlyLCBVbndhdGNoZWREaXIgfSBmcm9tICdicm9jY29saS1zb3VyY2UnO1xuXG5pbXBvcnQgTG9nZ2VyIGZyb20gJ2hlaW1kYWxsanMtbG9nZ2VyJztcbmNvbnN0IGxvZ2dlciA9IExvZ2dlcignQGdsaW1tZXIvYXBwbGljYXRpb24tcGlwZWxpbmU6Z2xpbW1lci1hcHAnKTtcblxuaW1wb3J0IHN0ZXcgZnJvbSAnYnJvY2NvbGktc3Rldyc7XG5pbXBvcnQgeyBUeXBlU2NyaXB0IH0gZnJvbSBcImJyb2Njb2xpLXR5cGVzY3JpcHQtY29tcGlsZXIvbGliL3BsdWdpblwiO1xuY29uc3QgbXYgPSBzdGV3Lm12O1xuY29uc3QgZmluZCA9IHN0ZXcuZmluZDtcbmNvbnN0IG1hcCA9IHN0ZXcubWFwO1xuXG5jb25zdCBERUZBVUxUX0NPTkZJRyA9IHtcbiAgb3V0cHV0UGF0aHM6IHtcbiAgICBhcHA6IHtcbiAgICAgIGh0bWw6ICdpbmRleC5odG1sJ1xuICAgIH1cbiAgfSxcbiAgY29uZmlnUGF0aDogJy4vY29uZmlnL2Vudmlyb25tZW50JyxcbiAgdHJlZXM6IHtcbiAgICBhcHA6ICdzcmMnLFxuICAgIHN0eWxlczogJ3NyYy91aS9zdHlsZXMnXG4gIH0sXG4gIGpzaGludHJjOiB7XG4gICAgdGVzdHM6ICd0ZXN0cycsXG4gICAgYXBwOiAnc3JjJ1xuICB9XG59O1xuXG5jb25zdCBERUZBVUxUX1RTX09QVElPTlMgPSB7XG4gIHRzY29uZmlnOiB7XG4gICAgY29tcGlsZXJPcHRpb25zOiB7XG4gICAgICB0YXJnZXQ6IFwiZXM1XCIsXG4gICAgICBtb2R1bGU6IFwiZXMyMDE1XCIsXG4gICAgICBpbmxpbmVTb3VyY2VNYXA6IHRydWUsXG4gICAgICBpbmxpbmVTb3VyY2VzOiB0cnVlLFxuICAgICAgbW9kdWxlUmVzb2x1dGlvbjogXCJub2RlXCJcbiAgICB9LFxuICAgIGV4Y2x1ZGU6IFtcbiAgICAgICdub2RlX21vZHVsZXMnLFxuICAgICAgJyoqLyouZC50cydcbiAgICBdXG4gIH1cbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2xpbW1lckFwcE9wdGlvbnMge1xuICBvdXRwdXRQYXRoczogYW55O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFkZG9uIHtcbiAgY29udGVudEZvcjogKHR5cGU6IHN0cmluZywgY29uZmlnLCBjb250ZW50OiBzdHJpbmdbXSkgPT4gc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFByb2plY3Qge1xuICByb290OiBzdHJpbmc7XG4gIG5hbWUoKTogc3RyaW5nO1xuICBjb25maWdQYXRoKCk6IHN0cmluZztcbiAgYWRkb25zOiBBZGRvbltdO1xuXG4gIHBrZzoge1xuICAgIG5hbWU6IHN0cmluZztcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRyZWVzIHtcbiAgc3JjVHJlZTogVHJlZTtcbiAgbm9kZU1vZHVsZXNUcmVlOiBUcmVlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRyZWUge1xuXG59XG5cbi8qKlxuICogR2xpbW1lckFwcCBwcm92aWRlcyBhbiBpbnRlcmZhY2UgdG8gYSBwYWNrYWdlIChhcHAsIGVuZ2luZSwgb3IgYWRkb24pXG4gKiBjb21wYXRpYmxlIHdpdGggdGhlIG1vZHVsZSB1bmlmaWNhdGlvbiBsYXlvdXQuXG4gKlxuICogQGNsYXNzIEdsaW1tZXJBcHBcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IFtkZWZhdWx0c11cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucz17fV0gQ29uZmlndXJhdGlvbiBvcHRpb25zXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdsaW1tZXJBcHAge1xuICBwdWJsaWMgb3B0aW9uczogR2xpbW1lckFwcE9wdGlvbnM7XG4gIHB1YmxpYyBwcm9qZWN0OiBQcm9qZWN0O1xuICBwdWJsaWMgbmFtZTogc3RyaW5nO1xuICBwdWJsaWMgZW52OiAncHJvZHVjdGlvbicgfCAnZGV2ZWxvcG1lbnQnIHwgJ3Rlc3QnO1xuXG4gIHByb3RlY3RlZCB0cmVlczogVHJlZXM7XG4gIHByb3RlY3RlZCBzcmNQYXRoOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoZGVmYXVsdHMsIG9wdGlvbnMpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgb3B0aW9ucyA9IGRlZmF1bHRzO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWZhdWx0c0RlZXAob3B0aW9ucywgZGVmYXVsdHMpO1xuICAgIH1cblxuICAgIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnMgPSBkZWZhdWx0c0RlZXAob3B0aW9ucywgREVGQVVMVF9DT05GSUcpO1xuXG4gICAgdGhpcy5lbnYgPSBwcm9jZXNzLmVudi5FTUJFUl9FTlYgfHwgJ2RldmVsb3BtZW50JztcbiAgICB0aGlzLnByb2plY3QgPSBvcHRpb25zLnByb2plY3Q7XG4gICAgdGhpcy5uYW1lID0gb3B0aW9ucy5uYW1lIHx8IHRoaXMucHJvamVjdC5uYW1lKCk7XG4gICAgdGhpcy50cmVlcyA9IHRoaXMuYnVpbGRUcmVlcygpO1xuXG4gICAgbGV0IHNyY1BhdGggPSBvcHRpb25zLnNyY1BhdGggfHwgJ3NyYyc7XG4gICAgdGhpcy5zcmNQYXRoID0gdGhpcy5yZXNvbHZlTG9jYWwoc3JjUGF0aCk7XG4gIH1cblxuICBfY29uZmlnUmVwbGFjZVBhdHRlcm5zKCkge1xuICAgIHJldHVybiBbe1xuICAgICAgbWF0Y2g6IC9cXHtcXHtyb290VVJMXFx9XFx9L2csXG4gICAgICByZXBsYWNlbWVudDogKCkgPT4gJycsXG4gICAgfSwge1xuICAgICAgbWF0Y2g6IC9cXHtcXHtjb250ZW50LWZvciBbJ1wiXSguKylbXCInXVxcfVxcfS9nLFxuICAgICAgcmVwbGFjZW1lbnQ6IHRoaXMuY29udGVudEZvci5iaW5kKHRoaXMpXG4gICAgfV07XG4gIH1cblxuICBidWlsZFRyZWVzKCk6IFRyZWVzIHtcbiAgICBjb25zdCBzcmNQYXRoID0gdGhpcy5yZXNvbHZlTG9jYWwoJ3NyYycpO1xuICAgIGNvbnN0IHNyY1RyZWUgPSBleGlzdHNTeW5jKHNyY1BhdGgpID8gbmV3IFdhdGNoZWREaXIoc3JjUGF0aCkgOiBudWxsO1xuXG4gICAgY29uc3Qgbm9kZU1vZHVsZXNUcmVlID0gbmV3IEZ1bm5lbChuZXcgVW53YXRjaGVkRGlyKHRoaXMucHJvamVjdC5yb290KSwge1xuICAgICAgc3JjRGlyOiAnbm9kZV9tb2R1bGVzL0BnbGltbWVyJyxcbiAgICAgIGRlc3REaXI6ICdub2RlX21vZHVsZXMvQGdsaW1tZXInLFxuICAgICAgaW5jbHVkZTogW1xuICAgICAgICAnKiovKi5kLnRzJyxcbiAgICAgICAgJyoqL3BhY2thZ2UuanNvbidcbiAgICAgIF1cbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICBzcmNUcmVlLFxuICAgICAgbm9kZU1vZHVsZXNUcmVlXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlTG9jYWwodG8pIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKHRoaXMucHJvamVjdC5yb290LCB0byk7XG4gIH1cblxuICBwcml2YXRlIHRzT3B0aW9ucygpIHtcbiAgICBsZXQgdHNjb25maWdQYXRoID0gdGhpcy5yZXNvbHZlTG9jYWwoJ3RzY29uZmlnLmpzb24nKTtcbiAgICBsZXQgdHNjb25maWc7XG5cbiAgICBpZiAoZXhpc3RzU3luYyh0c2NvbmZpZ1BhdGgpKSB7XG4gICAgICB0cnkge1xuICAgICAgICB0c2NvbmZpZyA9IHJlcXVpcmUodHNjb25maWdQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIHJlYWRpbmcgZnJvbSB0c2NvbmZpZy5qc29uXCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhcIk5vIHRzY29uZmlnLmpzb24gZm91bmQ7IGZhbGxpbmcgYmFjayB0byBkZWZhdWx0IFR5cGVTY3JpcHQgc2V0dGluZ3MuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB0c2NvbmZpZyA/IHsgdHNjb25maWcgfSA6IERFRkFVTFRfVFNfT1BUSU9OUztcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgQnJvY2NvbGkgdHJlZSByZXByZXNlbnRpbmcgdGhlIGNvbXBpbGVkIEdsaW1tZXIgYXBwbGljYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zXG4gICAqL1xuICB0b1RyZWUob3B0aW9ucykge1xuICAgIGxldCBpc1Byb2R1Y3Rpb24gPSBwcm9jZXNzLmVudi5FTUJFUl9FTlYgPT09ICdwcm9kdWN0aW9uJztcblxuICAgIGxldCBqc1RyZWUgPSB0aGlzLmphdmFzY3JpcHRUcmVlKCk7XG4gICAgbGV0IGNzc1RyZWUgPSB0aGlzLmNzc1RyZWUoKTtcbiAgICBsZXQgcHVibGljVHJlZSA9IHRoaXMucHVibGljVHJlZSgpO1xuICAgIGxldCBodG1sVHJlZSA9IHRoaXMuaHRtbFRyZWUoKTtcblxuICAgIC8vIE1pbmlmeSB0aGUgSmF2YVNjcmlwdCBpbiBwcm9kdWN0aW9uIGJ1aWxkcy5cbiAgICBpZiAoaXNQcm9kdWN0aW9uKSB7XG4gICAgICBqc1RyZWUgPSB0aGlzLm1pbmlmeVRyZWUoanNUcmVlKTtcbiAgICB9XG5cbiAgICBsZXQgdHJlZXMgPSBbanNUcmVlLCBodG1sVHJlZV07XG4gICAgaWYgKGNzc1RyZWUpIHtcbiAgICAgIHRyZWVzLnB1c2goY3NzVHJlZSk7XG4gICAgfVxuICAgIGlmIChwdWJsaWNUcmVlKSB7XG4gICAgICB0cmVlcy5wdXNoKHB1YmxpY1RyZWUpO1xuICAgIH1cblxuICAgIGxldCBhcHBUcmVlID0gbWVyZ2UodHJlZXMpO1xuXG4gICAgLy8gRmluZ2VycHJpbnQgYXNzZXRzIGZvciBjYWNoZSBidXN0aW5nIGluIHByb2R1Y3Rpb24uXG4gICAgLypcbiAgICAgRGlzYWJsZSBhc3NldC1yZXYgdW50aWwgaXQncyBwb3NzaWJsZSB0byBnZW5lcmF0ZSBhc3NldC1tYXBcbiAgICAgaW4gR2xpbW1lciBhcHBzLlxuICAgIGlmIChpc1Byb2R1Y3Rpb24pIHtcbiAgICAgIGxldCBleHRlbnNpb25zID0gWydqcycsICdjc3MnXTtcbiAgICAgIGxldCByZXBsYWNlRXh0ZW5zaW9ucyA9IFsnaHRtbCcsICdqcycsICdjc3MnXTtcbiAgICAgIGxldCBleGNsdWRlID0gWydzdy5qcycsICd3ZWItYW5pbWF0aW9ucy5taW4uanMnXTtcblxuICAgICAgYXBwVHJlZSA9IGFzc2V0UmV2KGFwcFRyZWUsIHtcbiAgICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICAgIGV4Y2x1ZGUsXG4gICAgICAgIGV4dGVuc2lvbnMsXG4gICAgICAgIHJlcGxhY2VFeHRlbnNpb25zXG4gICAgICB9KTtcbiAgICB9XG4gICAgKi9cblxuICAgIHJldHVybiBhcHBUcmVlO1xuICB9XG5cbiAgamF2YXNjcmlwdFRyZWUoKSB7XG4gICAgbGV0IHsgc3JjVHJlZSwgbm9kZU1vZHVsZXNUcmVlIH0gPSB0aGlzLnRyZWVzO1xuXG4gICAgLy8gR3JhYiB0aGUgYXBwJ3MgYHNyY2AgZGlyZWN0b3J5LlxuICAgIHNyY1RyZWUgPSBmaW5kKHNyY1RyZWUsIHtcbiAgICAgIGRlc3REaXI6ICdzcmMnXG4gICAgfSk7XG5cbiAgICAvLyBDb21waWxlIHRoZSBUeXBlU2NyaXB0IGFuZCBIYW5kbGViYXJzIGZpbGVzIGludG8gSmF2YVNjcmlwdFxuICAgIGNvbnN0IGNvbXBpbGVkSGFuZGxlYmFyc1RyZWUgPSB0aGlzLmNvbXBpbGVkSGFuZGxlYmFyc1RyZWUoc3JjVHJlZSk7XG4gICAgY29uc3QgY29tcGlsZWRUeXBlU2NyaXB0VHJlZSA9IHRoaXMuY29tcGlsZWRUeXBlU2NyaXB0VHJlZShzcmNUcmVlLCBub2RlTW9kdWxlc1RyZWUpXG5cbiAgICAvLyBSZW1vdmUgdG9wLW1vc3QgYHNyY2AgZGlyZWN0b3J5IHNvIG1vZHVsZSBuYW1lcyBkb24ndCBpbmNsdWRlIGl0LlxuICAgIGNvbnN0IHJlc29sdmFibGVUcmVlID0gZmluZChtZXJnZShbY29tcGlsZWRUeXBlU2NyaXB0VHJlZSwgY29tcGlsZWRIYW5kbGViYXJzVHJlZV0pLCB7XG4gICAgICBzcmNEaXI6ICdzcmMnXG4gICAgfSk7XG5cbiAgICAvLyBCdWlsZCB0aGUgZmlsZSB0aGF0IG1hcHMgaW5kaXZpZHVhbCBtb2R1bGVzIG9udG8gdGhlIHJlc29sdmVyJ3Mgc3BlY2lmaWVyXG4gICAgLy8ga2V5cy5cbiAgICBjb25zdCBtb2R1bGVNYXAgPSB0aGlzLmJ1aWxkUmVzb2x1dGlvbk1hcChyZXNvbHZhYmxlVHJlZSk7XG5cbiAgICAvLyBCdWlsZCB0aGUgcmVzb2x2ZXIgY29uZmlndXJhdGlvbiBmaWxlLlxuICAgIGNvbnN0IHJlc29sdmVyQ29uZmlndXJhdGlvbiA9IHRoaXMuYnVpbGRSZXNvbHZlckNvbmZpZ3VyYXRpb24oKTtcblxuICAgIC8vIE1lcmdlIHRoZSBKYXZhU2NyaXB0IHNvdXJjZSBhbmQgZ2VuZXJhdGVkIG1vZHVsZSBtYXAgYW5kIHJlc29sdmVyXG4gICAgLy8gY29uZmlndXJhdGlvbiBmaWxlcyB0b2dldGhlciwgbWFraW5nIHN1cmUgdG8gb3ZlcndyaXRlIHRoZSBzdHViXG4gICAgLy8gbW9kdWxlLW1hcC5qcyBhbmQgcmVzb2x2ZXItY29uZmlndXJhdGlvbi5qcyBpbiB0aGUgc291cmNlIHRyZWUgd2l0aCB0aGVcbiAgICAvLyBnZW5lcmF0ZWQgb25lcy5cbiAgICBsZXQganNUcmVlID0gbWVyZ2UoW1xuICAgICAgcmVzb2x2YWJsZVRyZWUsXG4gICAgICBtb2R1bGVNYXAsXG4gICAgICByZXNvbHZlckNvbmZpZ3VyYXRpb25cbiAgICBdLCB7IG92ZXJ3cml0ZTogdHJ1ZSB9KTtcblxuICAgIC8vIEZpbmFsbHksIGJ1bmRsZSB0aGUgYXBwIGludG8gYSBzaW5nbGUgcm9sbGVkIHVwIC5qcyBmaWxlLlxuICAgIHJldHVybiB0aGlzLnJvbGx1cFRyZWUoanNUcmVlKTtcbiAgfVxuXG4gIGNvbXBpbGVkVHlwZVNjcmlwdFRyZWUoc3JjVHJlZSwgbm9kZU1vZHVsZXNUcmVlKTogVHlwZVNjcmlwdCB7XG4gICAgY29uc3QgdHNPcHRpb25zID0gdGhpcy50c09wdGlvbnMoKTtcblxuICAgIGxldCBpbnB1dFRyZWVzID0gbWVyZ2UoW25vZGVNb2R1bGVzVHJlZSwgc3JjVHJlZV0pO1xuXG4gICAgcmV0dXJuIHR5cGVzY3JpcHQoaW5wdXRUcmVlcywgdHNPcHRpb25zKTtcbiAgfVxuXG4gIGNvbXBpbGVkSGFuZGxlYmFyc1RyZWUoc3JjVHJlZSkge1xuICAgIGxldCBoYnNUcmVlID0gZmluZChzcmNUcmVlLCB7XG4gICAgICBpbmNsdWRlOiBbJ3NyYy8qKi8qLmhicyddXG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IEdsaW1tZXJUZW1wbGF0ZVByZWNvbXBpbGVyKGhic1RyZWUsIHtcbiAgICAgIHJvb3ROYW1lOiB0aGlzLnByb2plY3QucGtnLm5hbWVcbiAgICB9KTtcbiAgfVxuXG4gIHJvbGx1cFRyZWUoanNUcmVlKSB7XG4gICAgcmV0dXJuIG5ldyBSb2xsdXBXaXRoRGVwZW5kZW5jaWVzKGpzVHJlZSwge1xuICAgICAgaW5wdXRGaWxlczogWycqKi8qLmpzJ10sXG4gICAgICByb2xsdXA6IHtcbiAgICAgICAgZm9ybWF0OiAndW1kJyxcbiAgICAgICAgZW50cnk6ICdpbmRleC5qcycsXG4gICAgICAgIGRlc3Q6ICdhcHAuanMnLFxuICAgICAgICBzb3VyY2VNYXA6ICdpbmxpbmUnXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBtaW5pZnlUcmVlKGpzVHJlZSkge1xuICAgIHJldHVybiB1Z2xpZnkoanNUcmVlLCB7XG4gICAgICBjb21wcmVzczoge1xuICAgICAgICBzY3Jld19pZTg6IHRydWUsXG4gICAgICB9LFxuICAgICAgc291cmNlTWFwQ29uZmlnOiB7XG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZXdyaXRlQ29uZmlnRW52aXJvbm1lbnQoc3JjKSB7XG4gICAgcmV0dXJuIG5ldyBDb25maWdSZXBsYWNlKHNyYywgdGhpcy5fY29uZmlnVHJlZSgpLCB7XG4gICAgICBjb25maWdQYXRoOiB0aGlzLl9jb25maWdQYXRoKCksXG4gICAgICBmaWxlczogWyAnY29uZmlnL2Vudmlyb25tZW50LmpzJyBdLFxuICAgICAgcGF0dGVybnM6IHRoaXMuX2NvbmZpZ1JlcGxhY2VQYXR0ZXJucygpXG4gICAgfSk7XG4gIH1cblxuICBidWlsZFJlc29sdXRpb25NYXAoc3JjKSB7XG4gICAgc3JjID0gZmluZChzcmMsIHtcbiAgICAgIGV4Y2x1ZGU6IFsnY29uZmlnLyoqLyonXVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBSZXNvbHV0aW9uTWFwQnVpbGRlcihzcmMsIHRoaXMuX2NvbmZpZ1RyZWUoKSwge1xuICAgICAgY29uZmlnUGF0aDogdGhpcy5fY29uZmlnUGF0aCgpLFxuICAgICAgZGVmYXVsdE1vZHVsZVByZWZpeDogdGhpcy5uYW1lLFxuICAgICAgZGVmYXVsdE1vZHVsZUNvbmZpZ3VyYXRpb25cbiAgICB9KTtcbiAgfVxuXG4gIGJ1aWxkUmVzb2x2ZXJDb25maWd1cmF0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVzb2x2ZXJDb25maWd1cmF0aW9uQnVpbGRlcih0aGlzLl9jb25maWdUcmVlKCksIHtcbiAgICAgIGNvbmZpZ1BhdGg6IHRoaXMuX2NvbmZpZ1BhdGgoKSxcbiAgICAgIGRlZmF1bHRNb2R1bGVQcmVmaXg6IHRoaXMubmFtZSxcbiAgICAgIGRlZmF1bHRNb2R1bGVDb25maWd1cmF0aW9uXG4gICAgfSk7XG4gIH1cblxuICBjc3NUcmVlKCkge1xuICAgIGxldCBzdHlsZXNQYXRoID0gcGF0aC5qb2luKHRoaXMuc3JjUGF0aCwgJ3VpJywgJ3N0eWxlcycpO1xuXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoc3R5bGVzUGF0aCkpIHtcbiAgICAgIC8vIENvbXBpbGUgU0FTUyBpZiBhcHAuc2NzcyBpcyBwcmVzZW50XG4gICAgICAvLyAodGhpcyB3b3JrcyB3aXRoIGltcG9ydHMgZnJvbSBhcHAuc2NzcylcbiAgICAgIGxldCBzY3NzUGF0aCA9IHBhdGguam9pbihzdHlsZXNQYXRoLCAnYXBwLnNjc3MnKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHNjc3NQYXRoKSkge1xuICAgICAgICByZXR1cm4gY29tcGlsZVNhc3MoW3N0eWxlc1BhdGhdLCAnYXBwLnNjc3MnLCAnYXBwLmNzcycsIHtcbiAgICAgICAgICBhbm5vdGF0aW9uOiAnRnVubmVsOiBzY3NzJ1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gT3RoZXJ3aXNlIGNvbmNhdCBhbGwgdGhlIGNzcyBpbiB0aGUgc3R5bGVzIGRpclxuICAgICAgcmV0dXJuIGNvbmNhdChuZXcgRnVubmVsKHN0eWxlc1BhdGgsIHtcbiAgICAgICAgaW5jbHVkZTogWycqKi8qLmNzcyddLFxuICAgICAgICBhbm5vdGF0aW9uOiAnRnVubmVsOiBjc3MnfSksXG4gICAgICAgIHsgb3V0cHV0RmlsZTogJ2FwcC5jc3MnIH0pO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpY1RyZWUoKSB7XG4gICAgbGV0IHB1YmxpY1BhdGggPSAncHVibGljJztcblxuICAgIGlmIChmcy5leGlzdHNTeW5jKHB1YmxpY1BhdGgpKSB7XG4gICAgICByZXR1cm4gbmV3IEZ1bm5lbChwdWJsaWNQYXRoLCB7XG4gICAgICAgIGFubm90YXRpb246ICdGdW5uZWw6IHB1YmxpYydcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGh0bWxUcmVlKCkge1xuICAgIGxldCBzcmNUcmVlID0gdGhpcy50cmVlcy5zcmNUcmVlO1xuXG4gICAgY29uc3QgaHRtbE5hbWUgPSB0aGlzLm9wdGlvbnMub3V0cHV0UGF0aHMuYXBwLmh0bWw7XG4gICAgY29uc3QgZmlsZXMgPSBbXG4gICAgICAndWkvaW5kZXguaHRtbCdcbiAgICBdO1xuXG4gICAgY29uc3QgaW5kZXggPSBuZXcgRnVubmVsKHNyY1RyZWUsIHtcbiAgICAgIGZpbGVzLFxuICAgICAgZ2V0RGVzdGluYXRpb25QYXRoKHJlbGF0aXZlUGF0aCkge1xuICAgICAgICBpZiAocmVsYXRpdmVQYXRoID09PSAndWkvaW5kZXguaHRtbCcpIHtcbiAgICAgICAgICByZWxhdGl2ZVBhdGggPSBodG1sTmFtZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVsYXRpdmVQYXRoO1xuICAgICAgfSxcbiAgICAgIGFubm90YXRpb246ICdGdW5uZWw6IGluZGV4Lmh0bWwnXG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IENvbmZpZ1JlcGxhY2UoaW5kZXgsIHRoaXMuX2NvbmZpZ1RyZWUoKSwge1xuICAgICAgY29uZmlnUGF0aDogdGhpcy5fY29uZmlnUGF0aCgpLFxuICAgICAgZmlsZXM6IFsgaHRtbE5hbWUgXSxcbiAgICAgIHBhdHRlcm5zOiB0aGlzLl9jb25maWdSZXBsYWNlUGF0dGVybnMoKVxuICAgIH0pO1xuICB9XG5cbiAgY29udGVudEZvcihjb25maWcsIG1hdGNoOiBSZWdFeHAsIHR5cGU6IHN0cmluZykge1xuICAgIGxldCBjb250ZW50OiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICBjYXNlICdoZWFkJzpcbiAgICAgICAgdGhpcy5fY29udGVudEZvckhlYWQoY29udGVudCwgY29uZmlnKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY29udGVudCA9IDxzdHJpbmdbXT50aGlzLnByb2plY3QuYWRkb25zLnJlZHVjZShmdW5jdGlvbihjb250ZW50OiBzdHJpbmdbXSwgYWRkb246IEFkZG9uKTogc3RyaW5nW10ge1xuICAgICAgdmFyIGFkZG9uQ29udGVudCA9IGFkZG9uLmNvbnRlbnRGb3IgPyBhZGRvbi5jb250ZW50Rm9yKHR5cGUsIGNvbmZpZywgY29udGVudCkgOiBudWxsO1xuICAgICAgaWYgKGFkZG9uQ29udGVudCkge1xuICAgICAgICByZXR1cm4gY29udGVudC5jb25jYXQoYWRkb25Db250ZW50KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgfSwgY29udGVudCk7XG5cbiAgICByZXR1cm4gY29udGVudC5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfY29udGVudEZvckhlYWQoY29udGVudDogc3RyaW5nW10sIGNvbmZpZykge1xuICAgIC8vIFRPRE8/XG4gICAgLy8gY29udGVudC5wdXNoKGNhbGN1bGF0ZUJhc2VUYWcoY29uZmlnKSk7XG5cbiAgICAvLyBUT0RPP1xuICAgIC8vIGlmICh0aGlzLm9wdGlvbnMuc3RvcmVDb25maWdJbk1ldGEpIHtcbiAgICAvLyAgIGNvbnRlbnQucHVzaCgnPG1ldGEgbmFtZT1cIicgKyBjb25maWcubW9kdWxlUHJlZml4ICsgJy9jb25maWcvZW52aXJvbm1lbnRcIiAnICtcbiAgICAvLyAgICAgICAgICAgICAgICdjb250ZW50PVwiJyArIGVzY2FwZShKU09OLnN0cmluZ2lmeShjb25maWcpKSArICdcIiAvPicpO1xuICAgIC8vIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBfY29uZmlnUGF0aCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBwYXRoLmpvaW4odGhpcy5uYW1lLCAnY29uZmlnJywgJ2Vudmlyb25tZW50cycsIHRoaXMuZW52ICsgJy5qc29uJyk7XG4gIH1cblxuICBfY2FjaGVkQ29uZmlnVHJlZTogYW55O1xuXG4gIHByb3RlY3RlZCBfY29uZmlnVHJlZSgpIHtcbiAgICBpZiAodGhpcy5fY2FjaGVkQ29uZmlnVHJlZSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2NhY2hlZENvbmZpZ1RyZWU7XG4gICAgfVxuXG4gICAgY29uc3QgY29uZmlnUGF0aCA9IHRoaXMucHJvamVjdC5jb25maWdQYXRoKCk7XG4gICAgY29uc3QgY29uZmlnVHJlZSA9IG5ldyBDb25maWdMb2FkZXIocGF0aC5kaXJuYW1lKGNvbmZpZ1BhdGgpLCB7XG4gICAgICBlbnY6IHRoaXMuZW52LFxuICAgICAgcHJvamVjdDogdGhpcy5wcm9qZWN0XG4gICAgfSk7XG5cbiAgICB0aGlzLl9jYWNoZWRDb25maWdUcmVlID0gbmV3IEZ1bm5lbChjb25maWdUcmVlLCB7XG4gICAgICBzcmNEaXI6ICcvJyxcbiAgICAgIGRlc3REaXI6IHRoaXMubmFtZSArICcvY29uZmlnJyxcbiAgICAgIGFubm90YXRpb246ICdGdW5uZWwgKGNvbmZpZyknXG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcy5fY2FjaGVkQ29uZmlnVHJlZTtcbiAgfVxufVxuIl19