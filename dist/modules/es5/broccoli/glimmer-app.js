function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
var logger = Logger('@glimmer/application-pipeline:glimmer-app');
import stew from 'broccoli-stew';
var mv = stew.mv;
var find = stew.find;
var map = stew.map;
var DEFAULT_CONFIG = {
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
var DEFAULT_TS_OPTIONS = {
    tsconfig: {
        compilerOptions: {
            target: "es5",
            module: "es2015",
            inlineSourceMap: true,
            inlineSources: true,
            moduleResolution: "node"
        },
        exclude: ['node_modules', '**/*.d.ts']
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

var GlimmerApp = function () {
    function GlimmerApp(defaults, options) {
        _classCallCheck(this, GlimmerApp);

        if (arguments.length === 0) {
            options = {};
        } else if (arguments.length === 1) {
            options = defaults;
        } else {
            defaultsDeep(options, defaults);
        }
        options = this.options = defaultsDeep(options, DEFAULT_CONFIG);
        this.env = process.env.EMBER_ENV || 'development';
        this.project = options.project;
        this.name = options.name || this.project.name();
        this.trees = this.buildTrees();
        var srcPath = options.srcPath || 'src';
        this.srcPath = this.resolveLocal(srcPath);
    }

    GlimmerApp.prototype._configReplacePatterns = function _configReplacePatterns() {
        return [{
            match: /\{\{rootURL\}\}/g,
            replacement: function () {
                return '';
            }
        }, {
            match: /\{\{content-for ['"](.+)["']\}\}/g,
            replacement: this.contentFor.bind(this)
        }];
    };

    GlimmerApp.prototype.buildTrees = function buildTrees() {
        var srcPath = this.resolveLocal('src');
        var srcTree = existsSync(srcPath) ? new WatchedDir(srcPath) : null;
        var nodeModulesTree = new Funnel(new UnwatchedDir(this.project.root), {
            srcDir: 'node_modules/@glimmer',
            destDir: 'node_modules/@glimmer',
            include: ['**/*.d.ts', '**/package.json']
        });
        return {
            srcTree: srcTree,
            nodeModulesTree: nodeModulesTree
        };
    };

    GlimmerApp.prototype.resolveLocal = function resolveLocal(to) {
        return path.join(this.project.root, to);
    };

    GlimmerApp.prototype.tsOptions = function tsOptions() {
        var tsconfigPath = this.resolveLocal('tsconfig.json');
        var tsconfig = void 0;
        if (existsSync(tsconfigPath)) {
            try {
                tsconfig = require(tsconfigPath);
            } catch (err) {
                console.log("Error reading from tsconfig.json");
            }
        } else {
            console.log("No tsconfig.json found; falling back to default TypeScript settings.");
        }
        return tsconfig ? { tsconfig: tsconfig } : DEFAULT_TS_OPTIONS;
    };
    /**
     * Creates a Broccoli tree representing the compiled Glimmer application.
     *
     * @param options
     */


    GlimmerApp.prototype.toTree = function toTree(options) {
        var isProduction = process.env.EMBER_ENV === 'production';
        var jsTree = this.javascriptTree();
        var cssTree = this.cssTree();
        var publicTree = this.publicTree();
        var htmlTree = this.htmlTree();
        // Minify the JavaScript in production builds.
        if (isProduction) {
            jsTree = this.minifyTree(jsTree);
        }
        var trees = [jsTree, htmlTree];
        if (cssTree) {
            trees.push(cssTree);
        }
        if (publicTree) {
            trees.push(publicTree);
        }
        var appTree = merge(trees);
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
    };

    GlimmerApp.prototype.javascriptTree = function javascriptTree() {
        var _trees = this.trees,
            srcTree = _trees.srcTree,
            nodeModulesTree = _trees.nodeModulesTree;
        // Grab the app's `src` directory.

        srcTree = find(srcTree, {
            destDir: 'src'
        });
        // Compile the TypeScript and Handlebars files into JavaScript
        var compiledHandlebarsTree = this.compiledHandlebarsTree(srcTree);
        var compiledTypeScriptTree = this.compiledTypeScriptTree(srcTree, nodeModulesTree);
        // Remove top-most `src` directory so module names don't include it.
        var resolvableTree = find(merge([compiledTypeScriptTree, compiledHandlebarsTree]), {
            srcDir: 'src'
        });
        // Build the file that maps individual modules onto the resolver's specifier
        // keys.
        var moduleMap = this.buildResolutionMap(resolvableTree);
        // Build the resolver configuration file.
        var resolverConfiguration = this.buildResolverConfiguration();
        // Merge the JavaScript source and generated module map and resolver
        // configuration files together, making sure to overwrite the stub
        // module-map.js and resolver-configuration.js in the source tree with the
        // generated ones.
        var jsTree = merge([resolvableTree, moduleMap, resolverConfiguration], { overwrite: true });
        // Finally, bundle the app into a single rolled up .js file.
        return this.rollupTree(jsTree);
    };

    GlimmerApp.prototype.compiledTypeScriptTree = function compiledTypeScriptTree(srcTree, nodeModulesTree) {
        var tsOptions = this.tsOptions();
        var inputTrees = merge([nodeModulesTree, srcTree]);
        return typescript(inputTrees, tsOptions);
    };

    GlimmerApp.prototype.compiledHandlebarsTree = function compiledHandlebarsTree(srcTree) {
        var hbsTree = find(srcTree, {
            include: ['src/**/*.hbs']
        });
        return new GlimmerTemplatePrecompiler(hbsTree, {
            rootName: this.project.pkg.name
        });
    };

    GlimmerApp.prototype.rollupTree = function rollupTree(jsTree) {
        return new RollupWithDependencies(jsTree, {
            inputFiles: ['**/*.js'],
            rollup: {
                format: 'umd',
                entry: 'index.js',
                dest: 'app.js',
                sourceMap: 'inline'
            }
        });
    };

    GlimmerApp.prototype.minifyTree = function minifyTree(jsTree) {
        return uglify(jsTree, {
            compress: {
                screw_ie8: true
            },
            sourceMapConfig: {
                enabled: false
            }
        });
    };

    GlimmerApp.prototype.rewriteConfigEnvironment = function rewriteConfigEnvironment(src) {
        return new ConfigReplace(src, this._configTree(), {
            configPath: this._configPath(),
            files: ['config/environment.js'],
            patterns: this._configReplacePatterns()
        });
    };

    GlimmerApp.prototype.buildResolutionMap = function buildResolutionMap(src) {
        src = find(src, {
            exclude: ['config/**/*']
        });
        return new ResolutionMapBuilder(src, this._configTree(), {
            configPath: this._configPath(),
            defaultModulePrefix: this.name,
            defaultModuleConfiguration: defaultModuleConfiguration
        });
    };

    GlimmerApp.prototype.buildResolverConfiguration = function buildResolverConfiguration() {
        return new ResolverConfigurationBuilder(this._configTree(), {
            configPath: this._configPath(),
            defaultModulePrefix: this.name,
            defaultModuleConfiguration: defaultModuleConfiguration
        });
    };

    GlimmerApp.prototype.cssTree = function cssTree() {
        var stylesPath = path.join(this.srcPath, 'ui', 'styles');
        if (fs.existsSync(stylesPath)) {
            // Compile SASS if app.scss is present
            // (this works with imports from app.scss)
            var scssPath = path.join(stylesPath, 'app.scss');
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
    };

    GlimmerApp.prototype.publicTree = function publicTree() {
        var publicPath = 'public';
        if (fs.existsSync(publicPath)) {
            return new Funnel(publicPath, {
                annotation: 'Funnel: public'
            });
        }
    };

    GlimmerApp.prototype.htmlTree = function htmlTree() {
        var srcTree = this.trees.srcTree;
        var htmlName = this.options.outputPaths.app.html;
        var files = ['ui/index.html'];
        var index = new Funnel(srcTree, {
            files: files,
            getDestinationPath: function (relativePath) {
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
    };

    GlimmerApp.prototype.contentFor = function contentFor(config, match, type) {
        var content = [];
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
    };

    GlimmerApp.prototype._contentForHead = function _contentForHead(content, config) {
        // TODO?
        // content.push(calculateBaseTag(config));
        // TODO?
        // if (this.options.storeConfigInMeta) {
        //   content.push('<meta name="' + config.modulePrefix + '/config/environment" ' +
        //               'content="' + escape(JSON.stringify(config)) + '" />');
        // }
    };

    GlimmerApp.prototype._configPath = function _configPath() {
        return path.join(this.name, 'config', 'environments', this.env + '.json');
    };

    GlimmerApp.prototype._configTree = function _configTree() {
        if (this._cachedConfigTree) {
            return this._cachedConfigTree;
        }
        var configPath = this.project.configPath();
        var configTree = new ConfigLoader(path.dirname(configPath), {
            env: this.env,
            project: this.project
        });
        this._cachedConfigTree = new Funnel(configTree, {
            srcDir: '/',
            destDir: this.name + '/config',
            annotation: 'Funnel (config)'
        });
        return this._cachedConfigTree;
    };

    return GlimmerApp;
}();

export default GlimmerApp;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xpbW1lci1hcHAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYnJvY2NvbGkvZ2xpbW1lci1hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxPQUFPLEFBQVksa0JBQU0sQUFBcUIsQUFBQztBQUUvQyxPQUFPLEFBQVksa0JBQU0sQUFBd0IsQUFBQztBQUNsRCxPQUFPLEFBQWEsbUJBQU0sQUFBeUIsQUFBQztBQUVwRCxPQUFPLEFBQU0sWUFBTSxBQUFpQixBQUFDO0FBQ3JDLE9BQU8sQUFBTSxZQUFNLEFBQWlCLEFBQUM7QUFDckMsT0FBTyxLQUFLLEFBQUksVUFBTSxBQUFNLEFBQUM7QUFDN0IsT0FBTyxLQUFLLEFBQUUsUUFBTSxBQUFJLEFBQUM7QUFDekIsQUFBTyxTQUFFLEFBQVUsQUFBRSxrQkFBTSxBQUE4QixBQUFDO0FBQzFELE9BQU8sQUFBVSxnQkFBTSxBQUFhLEFBQUM7QUFDckMsT0FBTyxBQUFLLFdBQU0sQUFBc0IsQUFBQztBQUN6QyxPQUFPLEFBQVcsaUJBQU0sQUFBZSxBQUFDO0FBRXhDLE9BQU8sQUFBTSxZQUFNLEFBQTJCLEFBQUM7QUFDL0MsT0FBTyxBQUFvQiwwQkFBTSxBQUFpQyxBQUFDO0FBQ25FLE9BQU8sQUFBNEIsa0NBQU0sQUFBeUMsQUFBQztBQUNuRixPQUFPLEFBQXNCLDRCQUFNLEFBQTRCLEFBQUM7QUFDaEUsT0FBTyxBQUEwQixnQ0FBTSxBQUFnQyxBQUFDO0FBQ3hFLE9BQU8sQUFBMEIsZ0NBQU0sQUFBZ0MsQUFBQztBQUN4RSxBQUFPLFNBQUUsQUFBVSxZQUFFLEFBQVksQUFBRSxvQkFBTSxBQUFpQixBQUFDO0FBRTNELE9BQU8sQUFBTSxZQUFNLEFBQW1CLEFBQUM7QUFDdkMsSUFBTSxBQUFNLFNBQUcsQUFBTSxPQUFDLEFBQTJDLEFBQUMsQUFBQztBQUVuRSxPQUFPLEFBQUksVUFBTSxBQUFlLEFBQUM7QUFFakMsSUFBTSxBQUFFLEtBQUcsQUFBSSxLQUFDLEFBQUUsQUFB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QUMsQUFBVSxBQUFFLEFBQUM7QUFDN0MsWUFBTSxBQUFVLGlCQUFPLEFBQVksYUFBQyxBQUFJLEtBQUMsQUFBTyxRQUFDLEFBQVUsQUFBQztBQUMxRCxBQUFHLGlCQUFFLEFBQUksS0FBQyxBQUFHO0FBQ2IsQUFBTyxxQkFBRSxBQUFJLEtBQUMsQUFBTyxBQUN0QixBQUFDLEFBQUM7QUFIMkQsU0FBM0M7QUFLbkIsQUFBSSxhQUFDLEFBQWlCLHdCQUFPLEFBQU0sT0FBQyxBQUFVO0FBQzVDLEFBQU0sb0JBQUUsQUFBRztBQUNYLEFBQU8scUJBQUUsQUFBSSxLQUFDLEFBQUksT0FBRyxBQUFTO0FBQzlCLEFBQVUsd0JBQUUsQUFBaUIsQUFDOUIsQUFBQyxBQUFDO0FBSjZDLFNBQXZCO0FBTXpCLEFBQU0sZUFBQyxBQUFJLEtBQUMsQUFBaUIsQUFBQyxBQUNoQztBQUFDLEFBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZGVmYXVsdHNEZWVwIGZyb20gJ2xvZGFzaC5kZWZhdWx0c2RlZXAnO1xuXG5pbXBvcnQgQ29uZmlnTG9hZGVyIGZyb20gJ2Jyb2Njb2xpLWNvbmZpZy1sb2FkZXInO1xuaW1wb3J0IENvbmZpZ1JlcGxhY2UgZnJvbSAnYnJvY2NvbGktY29uZmlnLXJlcGxhY2UnO1xuXG5pbXBvcnQgRnVubmVsIGZyb20gJ2Jyb2Njb2xpLWZ1bm5lbCc7XG5pbXBvcnQgY29uY2F0IGZyb20gJ2Jyb2Njb2xpLWNvbmNhdCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgdHlwZXNjcmlwdCB9IGZyb20gJ2Jyb2Njb2xpLXR5cGVzY3JpcHQtY29tcGlsZXInO1xuaW1wb3J0IGV4aXN0c1N5bmMgZnJvbSAnZXhpc3RzLXN5bmMnO1xuaW1wb3J0IG1lcmdlIGZyb20gJ2Jyb2Njb2xpLW1lcmdlLXRyZWVzJztcbmltcG9ydCBjb21waWxlU2FzcyBmcm9tICdicm9jY29saS1zYXNzJztcbmltcG9ydCBhc3NldFJldiBmcm9tICdicm9jY29saS1hc3NldC1yZXYnO1xuaW1wb3J0IHVnbGlmeSBmcm9tICdicm9jY29saS11Z2xpZnktc291cmNlbWFwJztcbmltcG9ydCBSZXNvbHV0aW9uTWFwQnVpbGRlciBmcm9tICdAZ2xpbW1lci9yZXNvbHV0aW9uLW1hcC1idWlsZGVyJztcbmltcG9ydCBSZXNvbHZlckNvbmZpZ3VyYXRpb25CdWlsZGVyIGZyb20gJ0BnbGltbWVyL3Jlc29sdmVyLWNvbmZpZ3VyYXRpb24tYnVpbGRlcic7XG5pbXBvcnQgUm9sbHVwV2l0aERlcGVuZGVuY2llcyBmcm9tICcuL3JvbGx1cC13aXRoLWRlcGVuZGVuY2llcyc7XG5pbXBvcnQgR2xpbW1lclRlbXBsYXRlUHJlY29tcGlsZXIgZnJvbSAnLi9nbGltbWVyLXRlbXBsYXRlLXByZWNvbXBpbGVyJztcbmltcG9ydCBkZWZhdWx0TW9kdWxlQ29uZmlndXJhdGlvbiBmcm9tICcuL2RlZmF1bHQtbW9kdWxlLWNvbmZpZ3VyYXRpb24nO1xuaW1wb3J0IHsgV2F0Y2hlZERpciwgVW53YXRjaGVkRGlyIH0gZnJvbSAnYnJvY2NvbGktc291cmNlJztcblxuaW1wb3J0IExvZ2dlciBmcm9tICdoZWltZGFsbGpzLWxvZ2dlcic7XG5jb25zdCBsb2dnZXIgPSBMb2dnZXIoJ0BnbGltbWVyL2FwcGxpY2F0aW9uLXBpcGVsaW5lOmdsaW1tZXItYXBwJyk7XG5cbmltcG9ydCBzdGV3IGZyb20gJ2Jyb2Njb2xpLXN0ZXcnO1xuaW1wb3J0IHsgVHlwZVNjcmlwdCB9IGZyb20gXCJicm9jY29saS10eXBlc2NyaXB0LWNvbXBpbGVyL2xpYi9wbHVnaW5cIjtcbmNvbnN0IG12ID0gc3Rldy5tdjtcbmNvbnN0IGZpbmQgPSBzdGV3LmZpbmQ7XG5jb25zdCBtYXAgPSBzdGV3Lm1hcDtcblxuY29uc3QgREVGQVVMVF9DT05GSUcgPSB7XG4gIG91dHB1dFBhdGhzOiB7XG4gICAgYXBwOiB7XG4gICAgICBodG1sOiAnaW5kZXguaHRtbCdcbiAgICB9XG4gIH0sXG4gIGNvbmZpZ1BhdGg6ICcuL2NvbmZpZy9lbnZpcm9ubWVudCcsXG4gIHRyZWVzOiB7XG4gICAgYXBwOiAnc3JjJyxcbiAgICBzdHlsZXM6ICdzcmMvdWkvc3R5bGVzJ1xuICB9LFxuICBqc2hpbnRyYzoge1xuICAgIHRlc3RzOiAndGVzdHMnLFxuICAgIGFwcDogJ3NyYydcbiAgfVxufTtcblxuY29uc3QgREVGQVVMVF9UU19PUFRJT05TID0ge1xuICB0c2NvbmZpZzoge1xuICAgIGNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgdGFyZ2V0OiBcImVzNVwiLFxuICAgICAgbW9kdWxlOiBcImVzMjAxNVwiLFxuICAgICAgaW5saW5lU291cmNlTWFwOiB0cnVlLFxuICAgICAgaW5saW5lU291cmNlczogdHJ1ZSxcbiAgICAgIG1vZHVsZVJlc29sdXRpb246IFwibm9kZVwiXG4gICAgfSxcbiAgICBleGNsdWRlOiBbXG4gICAgICAnbm9kZV9tb2R1bGVzJyxcbiAgICAgICcqKi8qLmQudHMnXG4gICAgXVxuICB9XG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIEdsaW1tZXJBcHBPcHRpb25zIHtcbiAgb3V0cHV0UGF0aHM6IGFueTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBZGRvbiB7XG4gIGNvbnRlbnRGb3I6ICh0eXBlOiBzdHJpbmcsIGNvbmZpZywgY29udGVudDogc3RyaW5nW10pID0+IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcm9qZWN0IHtcbiAgcm9vdDogc3RyaW5nO1xuICBuYW1lKCk6IHN0cmluZztcbiAgY29uZmlnUGF0aCgpOiBzdHJpbmc7XG4gIGFkZG9uczogQWRkb25bXTtcblxuICBwa2c6IHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBUcmVlcyB7XG4gIHNyY1RyZWU6IFRyZWU7XG4gIG5vZGVNb2R1bGVzVHJlZTogVHJlZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUcmVlIHtcblxufVxuXG4vKipcbiAqIEdsaW1tZXJBcHAgcHJvdmlkZXMgYW4gaW50ZXJmYWNlIHRvIGEgcGFja2FnZSAoYXBwLCBlbmdpbmUsIG9yIGFkZG9uKVxuICogY29tcGF0aWJsZSB3aXRoIHRoZSBtb2R1bGUgdW5pZmljYXRpb24gbGF5b3V0LlxuICpcbiAqIEBjbGFzcyBHbGltbWVyQXBwXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7T2JqZWN0fSBbZGVmYXVsdHNdXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHbGltbWVyQXBwIHtcbiAgcHVibGljIG9wdGlvbnM6IEdsaW1tZXJBcHBPcHRpb25zO1xuICBwdWJsaWMgcHJvamVjdDogUHJvamVjdDtcbiAgcHVibGljIG5hbWU6IHN0cmluZztcbiAgcHVibGljIGVudjogJ3Byb2R1Y3Rpb24nIHwgJ2RldmVsb3BtZW50JyB8ICd0ZXN0JztcblxuICBwcm90ZWN0ZWQgdHJlZXM6IFRyZWVzO1xuICBwcm90ZWN0ZWQgc3JjUGF0aDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKGRlZmF1bHRzLCBvcHRpb25zKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgIG9wdGlvbnMgPSBkZWZhdWx0cztcbiAgICB9IGVsc2Uge1xuICAgICAgZGVmYXVsdHNEZWVwKG9wdGlvbnMsIGRlZmF1bHRzKTtcbiAgICB9XG5cbiAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zID0gZGVmYXVsdHNEZWVwKG9wdGlvbnMsIERFRkFVTFRfQ09ORklHKTtcblxuICAgIHRoaXMuZW52ID0gcHJvY2Vzcy5lbnYuRU1CRVJfRU5WIHx8ICdkZXZlbG9wbWVudCc7XG4gICAgdGhpcy5wcm9qZWN0ID0gb3B0aW9ucy5wcm9qZWN0O1xuICAgIHRoaXMubmFtZSA9IG9wdGlvbnMubmFtZSB8fCB0aGlzLnByb2plY3QubmFtZSgpO1xuICAgIHRoaXMudHJlZXMgPSB0aGlzLmJ1aWxkVHJlZXMoKTtcblxuICAgIGxldCBzcmNQYXRoID0gb3B0aW9ucy5zcmNQYXRoIHx8ICdzcmMnO1xuICAgIHRoaXMuc3JjUGF0aCA9IHRoaXMucmVzb2x2ZUxvY2FsKHNyY1BhdGgpO1xuICB9XG5cbiAgX2NvbmZpZ1JlcGxhY2VQYXR0ZXJucygpIHtcbiAgICByZXR1cm4gW3tcbiAgICAgIG1hdGNoOiAvXFx7XFx7cm9vdFVSTFxcfVxcfS9nLFxuICAgICAgcmVwbGFjZW1lbnQ6ICgpID0+ICcnLFxuICAgIH0sIHtcbiAgICAgIG1hdGNoOiAvXFx7XFx7Y29udGVudC1mb3IgWydcIl0oLispW1wiJ11cXH1cXH0vZyxcbiAgICAgIHJlcGxhY2VtZW50OiB0aGlzLmNvbnRlbnRGb3IuYmluZCh0aGlzKVxuICAgIH1dO1xuICB9XG5cbiAgYnVpbGRUcmVlcygpOiBUcmVlcyB7XG4gICAgY29uc3Qgc3JjUGF0aCA9IHRoaXMucmVzb2x2ZUxvY2FsKCdzcmMnKTtcbiAgICBjb25zdCBzcmNUcmVlID0gZXhpc3RzU3luYyhzcmNQYXRoKSA/IG5ldyBXYXRjaGVkRGlyKHNyY1BhdGgpIDogbnVsbDtcblxuICAgIGNvbnN0IG5vZGVNb2R1bGVzVHJlZSA9IG5ldyBGdW5uZWwobmV3IFVud2F0Y2hlZERpcih0aGlzLnByb2plY3Qucm9vdCksIHtcbiAgICAgIHNyY0RpcjogJ25vZGVfbW9kdWxlcy9AZ2xpbW1lcicsXG4gICAgICBkZXN0RGlyOiAnbm9kZV9tb2R1bGVzL0BnbGltbWVyJyxcbiAgICAgIGluY2x1ZGU6IFtcbiAgICAgICAgJyoqLyouZC50cycsXG4gICAgICAgICcqKi9wYWNrYWdlLmpzb24nXG4gICAgICBdXG4gICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3JjVHJlZSxcbiAgICAgIG5vZGVNb2R1bGVzVHJlZVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZUxvY2FsKHRvKSB7XG4gICAgcmV0dXJuIHBhdGguam9pbih0aGlzLnByb2plY3Qucm9vdCwgdG8pO1xuICB9XG5cbiAgcHJpdmF0ZSB0c09wdGlvbnMoKSB7XG4gICAgbGV0IHRzY29uZmlnUGF0aCA9IHRoaXMucmVzb2x2ZUxvY2FsKCd0c2NvbmZpZy5qc29uJyk7XG4gICAgbGV0IHRzY29uZmlnO1xuXG4gICAgaWYgKGV4aXN0c1N5bmModHNjb25maWdQYXRoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdHNjb25maWcgPSByZXF1aXJlKHRzY29uZmlnUGF0aCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciByZWFkaW5nIGZyb20gdHNjb25maWcuanNvblwiKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coXCJObyB0c2NvbmZpZy5qc29uIGZvdW5kOyBmYWxsaW5nIGJhY2sgdG8gZGVmYXVsdCBUeXBlU2NyaXB0IHNldHRpbmdzLlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHNjb25maWcgPyB7IHRzY29uZmlnIH0gOiBERUZBVUxUX1RTX09QVElPTlM7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIEJyb2Njb2xpIHRyZWUgcmVwcmVzZW50aW5nIHRoZSBjb21waWxlZCBHbGltbWVyIGFwcGxpY2F0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgKi9cbiAgdG9UcmVlKG9wdGlvbnMpIHtcbiAgICBsZXQgaXNQcm9kdWN0aW9uID0gcHJvY2Vzcy5lbnYuRU1CRVJfRU5WID09PSAncHJvZHVjdGlvbic7XG5cbiAgICBsZXQganNUcmVlID0gdGhpcy5qYXZhc2NyaXB0VHJlZSgpO1xuICAgIGxldCBjc3NUcmVlID0gdGhpcy5jc3NUcmVlKCk7XG4gICAgbGV0IHB1YmxpY1RyZWUgPSB0aGlzLnB1YmxpY1RyZWUoKTtcbiAgICBsZXQgaHRtbFRyZWUgPSB0aGlzLmh0bWxUcmVlKCk7XG5cbiAgICAvLyBNaW5pZnkgdGhlIEphdmFTY3JpcHQgaW4gcHJvZHVjdGlvbiBidWlsZHMuXG4gICAgaWYgKGlzUHJvZHVjdGlvbikge1xuICAgICAganNUcmVlID0gdGhpcy5taW5pZnlUcmVlKGpzVHJlZSk7XG4gICAgfVxuXG4gICAgbGV0IHRyZWVzID0gW2pzVHJlZSwgaHRtbFRyZWVdO1xuICAgIGlmIChjc3NUcmVlKSB7XG4gICAgICB0cmVlcy5wdXNoKGNzc1RyZWUpO1xuICAgIH1cbiAgICBpZiAocHVibGljVHJlZSkge1xuICAgICAgdHJlZXMucHVzaChwdWJsaWNUcmVlKTtcbiAgICB9XG5cbiAgICBsZXQgYXBwVHJlZSA9IG1lcmdlKHRyZWVzKTtcblxuICAgIC8vIEZpbmdlcnByaW50IGFzc2V0cyBmb3IgY2FjaGUgYnVzdGluZyBpbiBwcm9kdWN0aW9uLlxuICAgIC8qXG4gICAgIERpc2FibGUgYXNzZXQtcmV2IHVudGlsIGl0J3MgcG9zc2libGUgdG8gZ2VuZXJhdGUgYXNzZXQtbWFwXG4gICAgIGluIEdsaW1tZXIgYXBwcy5cbiAgICBpZiAoaXNQcm9kdWN0aW9uKSB7XG4gICAgICBsZXQgZXh0ZW5zaW9ucyA9IFsnanMnLCAnY3NzJ107XG4gICAgICBsZXQgcmVwbGFjZUV4dGVuc2lvbnMgPSBbJ2h0bWwnLCAnanMnLCAnY3NzJ107XG4gICAgICBsZXQgZXhjbHVkZSA9IFsnc3cuanMnLCAnd2ViLWFuaW1hdGlvbnMubWluLmpzJ107XG5cbiAgICAgIGFwcFRyZWUgPSBhc3NldFJldihhcHBUcmVlLCB7XG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICBleGNsdWRlLFxuICAgICAgICBleHRlbnNpb25zLFxuICAgICAgICByZXBsYWNlRXh0ZW5zaW9uc1xuICAgICAgfSk7XG4gICAgfVxuICAgICovXG5cbiAgICByZXR1cm4gYXBwVHJlZTtcbiAgfVxuXG4gIGphdmFzY3JpcHRUcmVlKCkge1xuICAgIGxldCB7IHNyY1RyZWUsIG5vZGVNb2R1bGVzVHJlZSB9ID0gdGhpcy50cmVlcztcblxuICAgIC8vIEdyYWIgdGhlIGFwcCdzIGBzcmNgIGRpcmVjdG9yeS5cbiAgICBzcmNUcmVlID0gZmluZChzcmNUcmVlLCB7XG4gICAgICBkZXN0RGlyOiAnc3JjJ1xuICAgIH0pO1xuXG4gICAgLy8gQ29tcGlsZSB0aGUgVHlwZVNjcmlwdCBhbmQgSGFuZGxlYmFycyBmaWxlcyBpbnRvIEphdmFTY3JpcHRcbiAgICBjb25zdCBjb21waWxlZEhhbmRsZWJhcnNUcmVlID0gdGhpcy5jb21waWxlZEhhbmRsZWJhcnNUcmVlKHNyY1RyZWUpO1xuICAgIGNvbnN0IGNvbXBpbGVkVHlwZVNjcmlwdFRyZWUgPSB0aGlzLmNvbXBpbGVkVHlwZVNjcmlwdFRyZWUoc3JjVHJlZSwgbm9kZU1vZHVsZXNUcmVlKVxuXG4gICAgLy8gUmVtb3ZlIHRvcC1tb3N0IGBzcmNgIGRpcmVjdG9yeSBzbyBtb2R1bGUgbmFtZXMgZG9uJ3QgaW5jbHVkZSBpdC5cbiAgICBjb25zdCByZXNvbHZhYmxlVHJlZSA9IGZpbmQobWVyZ2UoW2NvbXBpbGVkVHlwZVNjcmlwdFRyZWUsIGNvbXBpbGVkSGFuZGxlYmFyc1RyZWVdKSwge1xuICAgICAgc3JjRGlyOiAnc3JjJ1xuICAgIH0pO1xuXG4gICAgLy8gQnVpbGQgdGhlIGZpbGUgdGhhdCBtYXBzIGluZGl2aWR1YWwgbW9kdWxlcyBvbnRvIHRoZSByZXNvbHZlcidzIHNwZWNpZmllclxuICAgIC8vIGtleXMuXG4gICAgY29uc3QgbW9kdWxlTWFwID0gdGhpcy5idWlsZFJlc29sdXRpb25NYXAocmVzb2x2YWJsZVRyZWUpO1xuXG4gICAgLy8gQnVpbGQgdGhlIHJlc29sdmVyIGNvbmZpZ3VyYXRpb24gZmlsZS5cbiAgICBjb25zdCByZXNvbHZlckNvbmZpZ3VyYXRpb24gPSB0aGlzLmJ1aWxkUmVzb2x2ZXJDb25maWd1cmF0aW9uKCk7XG5cbiAgICAvLyBNZXJnZSB0aGUgSmF2YVNjcmlwdCBzb3VyY2UgYW5kIGdlbmVyYXRlZCBtb2R1bGUgbWFwIGFuZCByZXNvbHZlclxuICAgIC8vIGNvbmZpZ3VyYXRpb24gZmlsZXMgdG9nZXRoZXIsIG1ha2luZyBzdXJlIHRvIG92ZXJ3cml0ZSB0aGUgc3R1YlxuICAgIC8vIG1vZHVsZS1tYXAuanMgYW5kIHJlc29sdmVyLWNvbmZpZ3VyYXRpb24uanMgaW4gdGhlIHNvdXJjZSB0cmVlIHdpdGggdGhlXG4gICAgLy8gZ2VuZXJhdGVkIG9uZXMuXG4gICAgbGV0IGpzVHJlZSA9IG1lcmdlKFtcbiAgICAgIHJlc29sdmFibGVUcmVlLFxuICAgICAgbW9kdWxlTWFwLFxuICAgICAgcmVzb2x2ZXJDb25maWd1cmF0aW9uXG4gICAgXSwgeyBvdmVyd3JpdGU6IHRydWUgfSk7XG5cbiAgICAvLyBGaW5hbGx5LCBidW5kbGUgdGhlIGFwcCBpbnRvIGEgc2luZ2xlIHJvbGxlZCB1cCAuanMgZmlsZS5cbiAgICByZXR1cm4gdGhpcy5yb2xsdXBUcmVlKGpzVHJlZSk7XG4gIH1cblxuICBjb21waWxlZFR5cGVTY3JpcHRUcmVlKHNyY1RyZWUsIG5vZGVNb2R1bGVzVHJlZSk6IFR5cGVTY3JpcHQge1xuICAgIGNvbnN0IHRzT3B0aW9ucyA9IHRoaXMudHNPcHRpb25zKCk7XG5cbiAgICBsZXQgaW5wdXRUcmVlcyA9IG1lcmdlKFtub2RlTW9kdWxlc1RyZWUsIHNyY1RyZWVdKTtcblxuICAgIHJldHVybiB0eXBlc2NyaXB0KGlucHV0VHJlZXMsIHRzT3B0aW9ucyk7XG4gIH1cblxuICBjb21waWxlZEhhbmRsZWJhcnNUcmVlKHNyY1RyZWUpIHtcbiAgICBsZXQgaGJzVHJlZSA9IGZpbmQoc3JjVHJlZSwge1xuICAgICAgaW5jbHVkZTogWydzcmMvKiovKi5oYnMnXVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBHbGltbWVyVGVtcGxhdGVQcmVjb21waWxlcihoYnNUcmVlLCB7XG4gICAgICByb290TmFtZTogdGhpcy5wcm9qZWN0LnBrZy5uYW1lXG4gICAgfSk7XG4gIH1cblxuICByb2xsdXBUcmVlKGpzVHJlZSkge1xuICAgIHJldHVybiBuZXcgUm9sbHVwV2l0aERlcGVuZGVuY2llcyhqc1RyZWUsIHtcbiAgICAgIGlucHV0RmlsZXM6IFsnKiovKi5qcyddLFxuICAgICAgcm9sbHVwOiB7XG4gICAgICAgIGZvcm1hdDogJ3VtZCcsXG4gICAgICAgIGVudHJ5OiAnaW5kZXguanMnLFxuICAgICAgICBkZXN0OiAnYXBwLmpzJyxcbiAgICAgICAgc291cmNlTWFwOiAnaW5saW5lJ1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgbWluaWZ5VHJlZShqc1RyZWUpIHtcbiAgICByZXR1cm4gdWdsaWZ5KGpzVHJlZSwge1xuICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgc2NyZXdfaWU4OiB0cnVlLFxuICAgICAgfSxcbiAgICAgIHNvdXJjZU1hcENvbmZpZzoge1xuICAgICAgICBlbmFibGVkOiBmYWxzZVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcmV3cml0ZUNvbmZpZ0Vudmlyb25tZW50KHNyYykge1xuICAgIHJldHVybiBuZXcgQ29uZmlnUmVwbGFjZShzcmMsIHRoaXMuX2NvbmZpZ1RyZWUoKSwge1xuICAgICAgY29uZmlnUGF0aDogdGhpcy5fY29uZmlnUGF0aCgpLFxuICAgICAgZmlsZXM6IFsgJ2NvbmZpZy9lbnZpcm9ubWVudC5qcycgXSxcbiAgICAgIHBhdHRlcm5zOiB0aGlzLl9jb25maWdSZXBsYWNlUGF0dGVybnMoKVxuICAgIH0pO1xuICB9XG5cbiAgYnVpbGRSZXNvbHV0aW9uTWFwKHNyYykge1xuICAgIHNyYyA9IGZpbmQoc3JjLCB7XG4gICAgICBleGNsdWRlOiBbJ2NvbmZpZy8qKi8qJ11cbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUmVzb2x1dGlvbk1hcEJ1aWxkZXIoc3JjLCB0aGlzLl9jb25maWdUcmVlKCksIHtcbiAgICAgIGNvbmZpZ1BhdGg6IHRoaXMuX2NvbmZpZ1BhdGgoKSxcbiAgICAgIGRlZmF1bHRNb2R1bGVQcmVmaXg6IHRoaXMubmFtZSxcbiAgICAgIGRlZmF1bHRNb2R1bGVDb25maWd1cmF0aW9uXG4gICAgfSk7XG4gIH1cblxuICBidWlsZFJlc29sdmVyQ29uZmlndXJhdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlc29sdmVyQ29uZmlndXJhdGlvbkJ1aWxkZXIodGhpcy5fY29uZmlnVHJlZSgpLCB7XG4gICAgICBjb25maWdQYXRoOiB0aGlzLl9jb25maWdQYXRoKCksXG4gICAgICBkZWZhdWx0TW9kdWxlUHJlZml4OiB0aGlzLm5hbWUsXG4gICAgICBkZWZhdWx0TW9kdWxlQ29uZmlndXJhdGlvblxuICAgIH0pO1xuICB9XG5cbiAgY3NzVHJlZSgpIHtcbiAgICBsZXQgc3R5bGVzUGF0aCA9IHBhdGguam9pbih0aGlzLnNyY1BhdGgsICd1aScsICdzdHlsZXMnKTtcblxuICAgIGlmIChmcy5leGlzdHNTeW5jKHN0eWxlc1BhdGgpKSB7XG4gICAgICAvLyBDb21waWxlIFNBU1MgaWYgYXBwLnNjc3MgaXMgcHJlc2VudFxuICAgICAgLy8gKHRoaXMgd29ya3Mgd2l0aCBpbXBvcnRzIGZyb20gYXBwLnNjc3MpXG4gICAgICBsZXQgc2Nzc1BhdGggPSBwYXRoLmpvaW4oc3R5bGVzUGF0aCwgJ2FwcC5zY3NzJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhzY3NzUGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIGNvbXBpbGVTYXNzKFtzdHlsZXNQYXRoXSwgJ2FwcC5zY3NzJywgJ2FwcC5jc3MnLCB7XG4gICAgICAgICAgYW5ub3RhdGlvbjogJ0Z1bm5lbDogc2NzcydcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIE90aGVyd2lzZSBjb25jYXQgYWxsIHRoZSBjc3MgaW4gdGhlIHN0eWxlcyBkaXJcbiAgICAgIHJldHVybiBjb25jYXQobmV3IEZ1bm5lbChzdHlsZXNQYXRoLCB7XG4gICAgICAgIGluY2x1ZGU6IFsnKiovKi5jc3MnXSxcbiAgICAgICAgYW5ub3RhdGlvbjogJ0Z1bm5lbDogY3NzJ30pLFxuICAgICAgICB7IG91dHB1dEZpbGU6ICdhcHAuY3NzJyB9KTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWNUcmVlKCkge1xuICAgIGxldCBwdWJsaWNQYXRoID0gJ3B1YmxpYyc7XG5cbiAgICBpZiAoZnMuZXhpc3RzU3luYyhwdWJsaWNQYXRoKSkge1xuICAgICAgcmV0dXJuIG5ldyBGdW5uZWwocHVibGljUGF0aCwge1xuICAgICAgICBhbm5vdGF0aW9uOiAnRnVubmVsOiBwdWJsaWMnXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBodG1sVHJlZSgpIHtcbiAgICBsZXQgc3JjVHJlZSA9IHRoaXMudHJlZXMuc3JjVHJlZTtcblxuICAgIGNvbnN0IGh0bWxOYW1lID0gdGhpcy5vcHRpb25zLm91dHB1dFBhdGhzLmFwcC5odG1sO1xuICAgIGNvbnN0IGZpbGVzID0gW1xuICAgICAgJ3VpL2luZGV4Lmh0bWwnXG4gICAgXTtcblxuICAgIGNvbnN0IGluZGV4ID0gbmV3IEZ1bm5lbChzcmNUcmVlLCB7XG4gICAgICBmaWxlcyxcbiAgICAgIGdldERlc3RpbmF0aW9uUGF0aChyZWxhdGl2ZVBhdGgpIHtcbiAgICAgICAgaWYgKHJlbGF0aXZlUGF0aCA9PT0gJ3VpL2luZGV4Lmh0bWwnKSB7XG4gICAgICAgICAgcmVsYXRpdmVQYXRoID0gaHRtbE5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlbGF0aXZlUGF0aDtcbiAgICAgIH0sXG4gICAgICBhbm5vdGF0aW9uOiAnRnVubmVsOiBpbmRleC5odG1sJ1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBDb25maWdSZXBsYWNlKGluZGV4LCB0aGlzLl9jb25maWdUcmVlKCksIHtcbiAgICAgIGNvbmZpZ1BhdGg6IHRoaXMuX2NvbmZpZ1BhdGgoKSxcbiAgICAgIGZpbGVzOiBbIGh0bWxOYW1lIF0sXG4gICAgICBwYXR0ZXJuczogdGhpcy5fY29uZmlnUmVwbGFjZVBhdHRlcm5zKClcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnRlbnRGb3IoY29uZmlnLCBtYXRjaDogUmVnRXhwLCB0eXBlOiBzdHJpbmcpIHtcbiAgICBsZXQgY29udGVudDogc3RyaW5nW10gPSBbXTtcblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnaGVhZCc6XG4gICAgICAgIHRoaXMuX2NvbnRlbnRGb3JIZWFkKGNvbnRlbnQsIGNvbmZpZyk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGNvbnRlbnQgPSA8c3RyaW5nW10+dGhpcy5wcm9qZWN0LmFkZG9ucy5yZWR1Y2UoZnVuY3Rpb24oY29udGVudDogc3RyaW5nW10sIGFkZG9uOiBBZGRvbik6IHN0cmluZ1tdIHtcbiAgICAgIHZhciBhZGRvbkNvbnRlbnQgPSBhZGRvbi5jb250ZW50Rm9yID8gYWRkb24uY29udGVudEZvcih0eXBlLCBjb25maWcsIGNvbnRlbnQpIDogbnVsbDtcbiAgICAgIGlmIChhZGRvbkNvbnRlbnQpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRlbnQuY29uY2F0KGFkZG9uQ29udGVudCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH0sIGNvbnRlbnQpO1xuXG4gICAgcmV0dXJuIGNvbnRlbnQuam9pbignXFxuJyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgX2NvbnRlbnRGb3JIZWFkKGNvbnRlbnQ6IHN0cmluZ1tdLCBjb25maWcpIHtcbiAgICAvLyBUT0RPP1xuICAgIC8vIGNvbnRlbnQucHVzaChjYWxjdWxhdGVCYXNlVGFnKGNvbmZpZykpO1xuXG4gICAgLy8gVE9ETz9cbiAgICAvLyBpZiAodGhpcy5vcHRpb25zLnN0b3JlQ29uZmlnSW5NZXRhKSB7XG4gICAgLy8gICBjb250ZW50LnB1c2goJzxtZXRhIG5hbWU9XCInICsgY29uZmlnLm1vZHVsZVByZWZpeCArICcvY29uZmlnL2Vudmlyb25tZW50XCIgJyArXG4gICAgLy8gICAgICAgICAgICAgICAnY29udGVudD1cIicgKyBlc2NhcGUoSlNPTi5zdHJpbmdpZnkoY29uZmlnKSkgKyAnXCIgLz4nKTtcbiAgICAvLyB9XG4gIH1cblxuICBwcm90ZWN0ZWQgX2NvbmZpZ1BhdGgoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKHRoaXMubmFtZSwgJ2NvbmZpZycsICdlbnZpcm9ubWVudHMnLCB0aGlzLmVudiArICcuanNvbicpO1xuICB9XG5cbiAgX2NhY2hlZENvbmZpZ1RyZWU6IGFueTtcblxuICBwcm90ZWN0ZWQgX2NvbmZpZ1RyZWUoKSB7XG4gICAgaWYgKHRoaXMuX2NhY2hlZENvbmZpZ1RyZWUpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jYWNoZWRDb25maWdUcmVlO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSB0aGlzLnByb2plY3QuY29uZmlnUGF0aCgpO1xuICAgIGNvbnN0IGNvbmZpZ1RyZWUgPSBuZXcgQ29uZmlnTG9hZGVyKHBhdGguZGlybmFtZShjb25maWdQYXRoKSwge1xuICAgICAgZW52OiB0aGlzLmVudixcbiAgICAgIHByb2plY3Q6IHRoaXMucHJvamVjdFxuICAgIH0pO1xuXG4gICAgdGhpcy5fY2FjaGVkQ29uZmlnVHJlZSA9IG5ldyBGdW5uZWwoY29uZmlnVHJlZSwge1xuICAgICAgc3JjRGlyOiAnLycsXG4gICAgICBkZXN0RGlyOiB0aGlzLm5hbWUgKyAnL2NvbmZpZycsXG4gICAgICBhbm5vdGF0aW9uOiAnRnVubmVsIChjb25maWcpJ1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXMuX2NhY2hlZENvbmZpZ1RyZWU7XG4gIH1cbn1cbiJdfQ==