'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _lodash = require('lodash.defaultsdeep');

var _lodash2 = _interopRequireDefault(_lodash);

var _broccoliConfigLoader = require('broccoli-config-loader');

var _broccoliConfigLoader2 = _interopRequireDefault(_broccoliConfigLoader);

var _broccoliConfigReplace = require('broccoli-config-replace');

var _broccoliConfigReplace2 = _interopRequireDefault(_broccoliConfigReplace);

var _broccoliFunnel = require('broccoli-funnel');

var _broccoliFunnel2 = _interopRequireDefault(_broccoliFunnel);

var _broccoliConcat = require('broccoli-concat');

var _broccoliConcat2 = _interopRequireDefault(_broccoliConcat);

var _path = require('path');

var path = _interopRequireWildcard(_path);

var _fs = require('fs');

var fs = _interopRequireWildcard(_fs);

var _broccoliTypescriptCompiler = require('broccoli-typescript-compiler');

var _existsSync = require('exists-sync');

var _existsSync2 = _interopRequireDefault(_existsSync);

var _broccoliMergeTrees = require('broccoli-merge-trees');

var _broccoliMergeTrees2 = _interopRequireDefault(_broccoliMergeTrees);

var _broccoliSass = require('broccoli-sass');

var _broccoliSass2 = _interopRequireDefault(_broccoliSass);

var _broccoliUglifySourcemap = require('broccoli-uglify-sourcemap');

var _broccoliUglifySourcemap2 = _interopRequireDefault(_broccoliUglifySourcemap);

var _resolutionMapBuilder = require('@glimmer/resolution-map-builder');

var _resolutionMapBuilder2 = _interopRequireDefault(_resolutionMapBuilder);

var _resolverConfigurationBuilder = require('@glimmer/resolver-configuration-builder');

var _resolverConfigurationBuilder2 = _interopRequireDefault(_resolverConfigurationBuilder);

var _rollupWithDependencies = require('./rollup-with-dependencies');

var _rollupWithDependencies2 = _interopRequireDefault(_rollupWithDependencies);

var _glimmerTemplatePrecompiler = require('./glimmer-template-precompiler');

var _glimmerTemplatePrecompiler2 = _interopRequireDefault(_glimmerTemplatePrecompiler);

var _defaultModuleConfiguration = require('./default-module-configuration');

var _defaultModuleConfiguration2 = _interopRequireDefault(_defaultModuleConfiguration);

var _broccoliSource = require('broccoli-source');

var _heimdalljsLogger = require('heimdalljs-logger');

var _heimdalljsLogger2 = _interopRequireDefault(_heimdalljsLogger);

var _broccoliStew = require('broccoli-stew');

var _broccoliStew2 = _interopRequireDefault(_broccoliStew);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const logger = (0, _heimdalljsLogger2.default)('@glimmer/application-pipeline:glimmer-app');

const mv = _broccoliStew2.default.mv;
const find = _broccoliStew2.default.find;
const map = _broccoliStew2.default.map;
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
class GlimmerApp {
    constructor(defaults, options) {
        if (arguments.length === 0) {
            options = {};
        } else if (arguments.length === 1) {
            options = defaults;
        } else {
            (0, _lodash2.default)(options, defaults);
        }
        options = this.options = (0, _lodash2.default)(options, DEFAULT_CONFIG);
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
            replacement: () => ''
        }, {
            match: /\{\{content-for ['"](.+)["']\}\}/g,
            replacement: this.contentFor.bind(this)
        }];
    }
    buildTrees() {
        const srcPath = this.resolveLocal('src');
        const srcTree = (0, _existsSync2.default)(srcPath) ? new _broccoliSource.WatchedDir(srcPath) : null;
        const nodeModulesTree = new _broccoliFunnel2.default(new _broccoliSource.UnwatchedDir(this.project.root), {
            srcDir: 'node_modules/@glimmer',
            destDir: 'node_modules/@glimmer',
            include: ['**/*.d.ts', '**/package.json']
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
        if ((0, _existsSync2.default)(tsconfigPath)) {
            try {
                tsconfig = require(tsconfigPath);
            } catch (err) {
                console.log("Error reading from tsconfig.json");
            }
        } else {
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
        let appTree = (0, _broccoliMergeTrees2.default)(trees);
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
        const resolvableTree = find((0, _broccoliMergeTrees2.default)([compiledTypeScriptTree, compiledHandlebarsTree]), {
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
        let jsTree = (0, _broccoliMergeTrees2.default)([resolvableTree, moduleMap, resolverConfiguration], { overwrite: true });
        // Finally, bundle the app into a single rolled up .js file.
        return this.rollupTree(jsTree);
    }
    compiledTypeScriptTree(srcTree, nodeModulesTree) {
        const tsOptions = this.tsOptions();
        let inputTrees = (0, _broccoliMergeTrees2.default)([nodeModulesTree, srcTree]);
        return (0, _broccoliTypescriptCompiler.typescript)(inputTrees, tsOptions);
    }
    compiledHandlebarsTree(srcTree) {
        let hbsTree = find(srcTree, {
            include: ['src/**/*.hbs']
        });
        return new _glimmerTemplatePrecompiler2.default(hbsTree, {
            rootName: this.project.pkg.name
        });
    }
    rollupTree(jsTree) {
        return new _rollupWithDependencies2.default(jsTree, {
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
        return (0, _broccoliUglifySourcemap2.default)(jsTree, {
            compress: {
                screw_ie8: true
            },
            sourceMapConfig: {
                enabled: false
            }
        });
    }
    rewriteConfigEnvironment(src) {
        return new _broccoliConfigReplace2.default(src, this._configTree(), {
            configPath: this._configPath(),
            files: ['config/environment.js'],
            patterns: this._configReplacePatterns()
        });
    }
    buildResolutionMap(src) {
        src = find(src, {
            exclude: ['config/**/*']
        });
        return new _resolutionMapBuilder2.default(src, this._configTree(), {
            configPath: this._configPath(),
            defaultModulePrefix: this.name,
            defaultModuleConfiguration: _defaultModuleConfiguration2.default
        });
    }
    buildResolverConfiguration() {
        return new _resolverConfigurationBuilder2.default(this._configTree(), {
            configPath: this._configPath(),
            defaultModulePrefix: this.name,
            defaultModuleConfiguration: _defaultModuleConfiguration2.default
        });
    }
    cssTree() {
        let stylesPath = path.join(this.srcPath, 'ui', 'styles');
        if (fs.existsSync(stylesPath)) {
            // Compile SASS if app.scss is present
            // (this works with imports from app.scss)
            let scssPath = path.join(stylesPath, 'app.scss');
            if (fs.existsSync(scssPath)) {
                return (0, _broccoliSass2.default)([stylesPath], 'app.scss', 'app.css', {
                    annotation: 'Funnel: scss'
                });
            }
            // Otherwise concat all the css in the styles dir
            return (0, _broccoliConcat2.default)(new _broccoliFunnel2.default(stylesPath, {
                include: ['**/*.css'],
                annotation: 'Funnel: css'
            }), { outputFile: 'app.css' });
        }
    }
    publicTree() {
        let publicPath = 'public';
        if (fs.existsSync(publicPath)) {
            return new _broccoliFunnel2.default(publicPath, {
                annotation: 'Funnel: public'
            });
        }
    }
    htmlTree() {
        let srcTree = this.trees.srcTree;
        const htmlName = this.options.outputPaths.app.html;
        const files = ['ui/index.html'];
        const index = new _broccoliFunnel2.default(srcTree, {
            files,
            getDestinationPath(relativePath) {
                if (relativePath === 'ui/index.html') {
                    relativePath = htmlName;
                }
                return relativePath;
            },
            annotation: 'Funnel: index.html'
        });
        return new _broccoliConfigReplace2.default(index, this._configTree(), {
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
        const configTree = new _broccoliConfigLoader2.default(path.dirname(configPath), {
            env: this.env,
            project: this.project
        });
        this._cachedConfigTree = new _broccoliFunnel2.default(configTree, {
            srcDir: '/',
            destDir: this.name + '/config',
            annotation: 'Funnel (config)'
        });
        return this._cachedConfigTree;
    }
}
exports.default = GlimmerApp;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xpbW1lci1hcHAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYnJvY2NvbGkvZ2xpbW1lci1hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsQUFBTyxBQUFZLEFBQU0sQUFBcUIsQUFBQzs7OztBQUUvQyxBQUFPLEFBQVksQUFBTSxBQUF3QixBQUFDOzs7O0FBQ2xELEFBQU8sQUFBYSxBQUFNLEFBQXlCLEFBQUM7Ozs7QUFFcEQsQUFBTyxBQUFNLEFBQU0sQUFBaUIsQUFBQzs7OztBQUNyQyxBQUFPLEFBQU0sQUFBTSxBQUFpQixBQUFDOzs7O0FBQ3JDLEFBQU87O0lBQUssQUFBSSxBQUFNLEFBQU0sQUFBQzs7QUFDN0IsQUFBTzs7SUFBSyxBQUFFLEFBQU0sQUFBSSxBQUFDOztBQUN6QixBQUFPLEFBQUUsQUFBVSxBQUFFLEFBQU0sQUFBOEIsQUFBQzs7QUFDMUQsQUFBTyxBQUFVLEFBQU0sQUFBYSxBQUFDOzs7O0FBQ3JDLEFBQU8sQUFBSyxBQUFNLEFBQXNCLEFBQUM7Ozs7QUFDekMsQUFBTyxBQUFXLEFBQU0sQUFBZSxBQUFDOzs7O0FBRXhDLEFBQU8sQUFBTSxBQUFNLEFBQTJCLEFBQUM7Ozs7QUFDL0MsQUFBTyxBQUFvQixBQUFNLEFBQWlDLEFBQUM7Ozs7QUFDbkUsQUFBTyxBQUE0QixBQUFNLEFBQXlDLEFBQUM7Ozs7QUFDbkYsQUFBTyxBQUFzQixBQUFNLEFBQTRCLEFBQUM7Ozs7QUFDaEUsQUFBTyxBQUEwQixBQUFNLEFBQWdDLEFBQUM7Ozs7QUFDeEUsQUFBTyxBQUEwQixBQUFNLEFBQWdDLEFBQUM7Ozs7QUFDeEUsQUFBTyxBQUFFLEFBQVUsQUFBRSxBQUFZLEFBQUUsQUFBTSxBQUFpQixBQUFDOztBQUUzRCxBQUFPLEFBQU0sQUFBTSxBQUFtQixBQUFDOzs7O0FBR3ZDLEFBQU8sQUFBSSxBQUFNLEFBQWUsQUFBQzs7Ozs7Ozs7QUFGakMsTUFBTSxBQUFNLFNBQUcsQUFBTSxnQ0FBQyxBQUEy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VSxhQUFHLEFBQUksS0FBQyxBQUFPLFFBQUMsQUFBVSxBQUFFLEFBQUM7QUFDN0MsY0FBTSxBQUFVLGdEQUFvQixBQUFJLEtBQUMsQUFBTyxRQUFDLEFBQVUsQUFBQztBQUMxRCxBQUFHLGlCQUFFLEFBQUksS0FBQyxBQUFHO0FBQ2IsQUFBTyxxQkFBRSxBQUFJLEtBQUMsQUFBTyxBQUN0QixBQUFDLEFBQUM7QUFIMkQsU0FBM0MsQUFBSSxBQUFZO0FBS25DLEFBQUksYUFBQyxBQUFpQixpREFBYyxBQUFVO0FBQzVDLEFBQU0sb0JBQUUsQUFBRztBQUNYLEFBQU8scUJBQUUsQUFBSSxLQUFDLEFBQUksT0FBRyxBQUFTO0FBQzlCLEFBQVUsd0JBQUUsQUFBaUIsQUFDOUIsQUFBQyxBQUFDO0FBSjZDLFNBQXZCLEFBQUksQUFBTTtBQU1uQyxBQUFNLGVBQUMsQUFBSSxLQUFDLEFBQWlCLEFBQUMsQUFDaEM7QUFBQyxBQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGRlZmF1bHRzRGVlcCBmcm9tICdsb2Rhc2guZGVmYXVsdHNkZWVwJztcblxuaW1wb3J0IENvbmZpZ0xvYWRlciBmcm9tICdicm9jY29saS1jb25maWctbG9hZGVyJztcbmltcG9ydCBDb25maWdSZXBsYWNlIGZyb20gJ2Jyb2Njb2xpLWNvbmZpZy1yZXBsYWNlJztcblxuaW1wb3J0IEZ1bm5lbCBmcm9tICdicm9jY29saS1mdW5uZWwnO1xuaW1wb3J0IGNvbmNhdCBmcm9tICdicm9jY29saS1jb25jYXQnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7IHR5cGVzY3JpcHQgfSBmcm9tICdicm9jY29saS10eXBlc2NyaXB0LWNvbXBpbGVyJztcbmltcG9ydCBleGlzdHNTeW5jIGZyb20gJ2V4aXN0cy1zeW5jJztcbmltcG9ydCBtZXJnZSBmcm9tICdicm9jY29saS1tZXJnZS10cmVlcyc7XG5pbXBvcnQgY29tcGlsZVNhc3MgZnJvbSAnYnJvY2NvbGktc2Fzcyc7XG5pbXBvcnQgYXNzZXRSZXYgZnJvbSAnYnJvY2NvbGktYXNzZXQtcmV2JztcbmltcG9ydCB1Z2xpZnkgZnJvbSAnYnJvY2NvbGktdWdsaWZ5LXNvdXJjZW1hcCc7XG5pbXBvcnQgUmVzb2x1dGlvbk1hcEJ1aWxkZXIgZnJvbSAnQGdsaW1tZXIvcmVzb2x1dGlvbi1tYXAtYnVpbGRlcic7XG5pbXBvcnQgUmVzb2x2ZXJDb25maWd1cmF0aW9uQnVpbGRlciBmcm9tICdAZ2xpbW1lci9yZXNvbHZlci1jb25maWd1cmF0aW9uLWJ1aWxkZXInO1xuaW1wb3J0IFJvbGx1cFdpdGhEZXBlbmRlbmNpZXMgZnJvbSAnLi9yb2xsdXAtd2l0aC1kZXBlbmRlbmNpZXMnO1xuaW1wb3J0IEdsaW1tZXJUZW1wbGF0ZVByZWNvbXBpbGVyIGZyb20gJy4vZ2xpbW1lci10ZW1wbGF0ZS1wcmVjb21waWxlcic7XG5pbXBvcnQgZGVmYXVsdE1vZHVsZUNvbmZpZ3VyYXRpb24gZnJvbSAnLi9kZWZhdWx0LW1vZHVsZS1jb25maWd1cmF0aW9uJztcbmltcG9ydCB7IFdhdGNoZWREaXIsIFVud2F0Y2hlZERpciB9IGZyb20gJ2Jyb2Njb2xpLXNvdXJjZSc7XG5cbmltcG9ydCBMb2dnZXIgZnJvbSAnaGVpbWRhbGxqcy1sb2dnZXInO1xuY29uc3QgbG9nZ2VyID0gTG9nZ2VyKCdAZ2xpbW1lci9hcHBsaWNhdGlvbi1waXBlbGluZTpnbGltbWVyLWFwcCcpO1xuXG5pbXBvcnQgc3RldyBmcm9tICdicm9jY29saS1zdGV3JztcbmltcG9ydCB7IFR5cGVTY3JpcHQgfSBmcm9tIFwiYnJvY2NvbGktdHlwZXNjcmlwdC1jb21waWxlci9saWIvcGx1Z2luXCI7XG5jb25zdCBtdiA9IHN0ZXcubXY7XG5jb25zdCBmaW5kID0gc3Rldy5maW5kO1xuY29uc3QgbWFwID0gc3Rldy5tYXA7XG5cbmNvbnN0IERFRkFVTFRfQ09ORklHID0ge1xuICBvdXRwdXRQYXRoczoge1xuICAgIGFwcDoge1xuICAgICAgaHRtbDogJ2luZGV4Lmh0bWwnXG4gICAgfVxuICB9LFxuICBjb25maWdQYXRoOiAnLi9jb25maWcvZW52aXJvbm1lbnQnLFxuICB0cmVlczoge1xuICAgIGFwcDogJ3NyYycsXG4gICAgc3R5bGVzOiAnc3JjL3VpL3N0eWxlcydcbiAgfSxcbiAganNoaW50cmM6IHtcbiAgICB0ZXN0czogJ3Rlc3RzJyxcbiAgICBhcHA6ICdzcmMnXG4gIH1cbn07XG5cbmNvbnN0IERFRkFVTFRfVFNfT1BUSU9OUyA9IHtcbiAgdHNjb25maWc6IHtcbiAgICBjb21waWxlck9wdGlvbnM6IHtcbiAgICAgIHRhcmdldDogXCJlczVcIixcbiAgICAgIG1vZHVsZTogXCJlczIwMTVcIixcbiAgICAgIGlubGluZVNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgIGlubGluZVNvdXJjZXM6IHRydWUsXG4gICAgICBtb2R1bGVSZXNvbHV0aW9uOiBcIm5vZGVcIlxuICAgIH0sXG4gICAgZXhjbHVkZTogW1xuICAgICAgJ25vZGVfbW9kdWxlcycsXG4gICAgICAnKiovKi5kLnRzJ1xuICAgIF1cbiAgfVxufTtcblxuZXhwb3J0IGludGVyZmFjZSBHbGltbWVyQXBwT3B0aW9ucyB7XG4gIG91dHB1dFBhdGhzOiBhbnk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWRkb24ge1xuICBjb250ZW50Rm9yOiAodHlwZTogc3RyaW5nLCBjb25maWcsIGNvbnRlbnQ6IHN0cmluZ1tdKSA9PiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvamVjdCB7XG4gIHJvb3Q6IHN0cmluZztcbiAgbmFtZSgpOiBzdHJpbmc7XG4gIGNvbmZpZ1BhdGgoKTogc3RyaW5nO1xuICBhZGRvbnM6IEFkZG9uW107XG5cbiAgcGtnOiB7XG4gICAgbmFtZTogc3RyaW5nO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHJlZXMge1xuICBzcmNUcmVlOiBUcmVlO1xuICBub2RlTW9kdWxlc1RyZWU6IFRyZWU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHJlZSB7XG5cbn1cblxuLyoqXG4gKiBHbGltbWVyQXBwIHByb3ZpZGVzIGFuIGludGVyZmFjZSB0byBhIHBhY2thZ2UgKGFwcCwgZW5naW5lLCBvciBhZGRvbilcbiAqIGNvbXBhdGlibGUgd2l0aCB0aGUgbW9kdWxlIHVuaWZpY2F0aW9uIGxheW91dC5cbiAqXG4gKiBAY2xhc3MgR2xpbW1lckFwcFxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gW2RlZmF1bHRzXVxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zPXt9XSBDb25maWd1cmF0aW9uIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR2xpbW1lckFwcCB7XG4gIHB1YmxpYyBvcHRpb25zOiBHbGltbWVyQXBwT3B0aW9ucztcbiAgcHVibGljIHByb2plY3Q6IFByb2plY3Q7XG4gIHB1YmxpYyBuYW1lOiBzdHJpbmc7XG4gIHB1YmxpYyBlbnY6ICdwcm9kdWN0aW9uJyB8ICdkZXZlbG9wbWVudCcgfCAndGVzdCc7XG5cbiAgcHJvdGVjdGVkIHRyZWVzOiBUcmVlcztcbiAgcHJvdGVjdGVkIHNyY1BhdGg6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihkZWZhdWx0cywgb3B0aW9ucykge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICBvcHRpb25zID0gZGVmYXVsdHM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlZmF1bHRzRGVlcChvcHRpb25zLCBkZWZhdWx0cyk7XG4gICAgfVxuXG4gICAgb3B0aW9ucyA9IHRoaXMub3B0aW9ucyA9IGRlZmF1bHRzRGVlcChvcHRpb25zLCBERUZBVUxUX0NPTkZJRyk7XG5cbiAgICB0aGlzLmVudiA9IHByb2Nlc3MuZW52LkVNQkVSX0VOViB8fCAnZGV2ZWxvcG1lbnQnO1xuICAgIHRoaXMucHJvamVjdCA9IG9wdGlvbnMucHJvamVjdDtcbiAgICB0aGlzLm5hbWUgPSBvcHRpb25zLm5hbWUgfHwgdGhpcy5wcm9qZWN0Lm5hbWUoKTtcbiAgICB0aGlzLnRyZWVzID0gdGhpcy5idWlsZFRyZWVzKCk7XG5cbiAgICBsZXQgc3JjUGF0aCA9IG9wdGlvbnMuc3JjUGF0aCB8fCAnc3JjJztcbiAgICB0aGlzLnNyY1BhdGggPSB0aGlzLnJlc29sdmVMb2NhbChzcmNQYXRoKTtcbiAgfVxuXG4gIF9jb25maWdSZXBsYWNlUGF0dGVybnMoKSB7XG4gICAgcmV0dXJuIFt7XG4gICAgICBtYXRjaDogL1xce1xce3Jvb3RVUkxcXH1cXH0vZyxcbiAgICAgIHJlcGxhY2VtZW50OiAoKSA9PiAnJyxcbiAgICB9LCB7XG4gICAgICBtYXRjaDogL1xce1xce2NvbnRlbnQtZm9yIFsnXCJdKC4rKVtcIiddXFx9XFx9L2csXG4gICAgICByZXBsYWNlbWVudDogdGhpcy5jb250ZW50Rm9yLmJpbmQodGhpcylcbiAgICB9XTtcbiAgfVxuXG4gIGJ1aWxkVHJlZXMoKTogVHJlZXMge1xuICAgIGNvbnN0IHNyY1BhdGggPSB0aGlzLnJlc29sdmVMb2NhbCgnc3JjJyk7XG4gICAgY29uc3Qgc3JjVHJlZSA9IGV4aXN0c1N5bmMoc3JjUGF0aCkgPyBuZXcgV2F0Y2hlZERpcihzcmNQYXRoKSA6IG51bGw7XG5cbiAgICBjb25zdCBub2RlTW9kdWxlc1RyZWUgPSBuZXcgRnVubmVsKG5ldyBVbndhdGNoZWREaXIodGhpcy5wcm9qZWN0LnJvb3QpLCB7XG4gICAgICBzcmNEaXI6ICdub2RlX21vZHVsZXMvQGdsaW1tZXInLFxuICAgICAgZGVzdERpcjogJ25vZGVfbW9kdWxlcy9AZ2xpbW1lcicsXG4gICAgICBpbmNsdWRlOiBbXG4gICAgICAgICcqKi8qLmQudHMnLFxuICAgICAgICAnKiovcGFja2FnZS5qc29uJ1xuICAgICAgXVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHNyY1RyZWUsXG4gICAgICBub2RlTW9kdWxlc1RyZWVcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVMb2NhbCh0bykge1xuICAgIHJldHVybiBwYXRoLmpvaW4odGhpcy5wcm9qZWN0LnJvb3QsIHRvKTtcbiAgfVxuXG4gIHByaXZhdGUgdHNPcHRpb25zKCkge1xuICAgIGxldCB0c2NvbmZpZ1BhdGggPSB0aGlzLnJlc29sdmVMb2NhbCgndHNjb25maWcuanNvbicpO1xuICAgIGxldCB0c2NvbmZpZztcblxuICAgIGlmIChleGlzdHNTeW5jKHRzY29uZmlnUGF0aCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRzY29uZmlnID0gcmVxdWlyZSh0c2NvbmZpZ1BhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgcmVhZGluZyBmcm9tIHRzY29uZmlnLmpzb25cIik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiTm8gdHNjb25maWcuanNvbiBmb3VuZDsgZmFsbGluZyBiYWNrIHRvIGRlZmF1bHQgVHlwZVNjcmlwdCBzZXR0aW5ncy5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRzY29uZmlnID8geyB0c2NvbmZpZyB9IDogREVGQVVMVF9UU19PUFRJT05TO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBCcm9jY29saSB0cmVlIHJlcHJlc2VudGluZyB0aGUgY29tcGlsZWQgR2xpbW1lciBhcHBsaWNhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIG9wdGlvbnNcbiAgICovXG4gIHRvVHJlZShvcHRpb25zKSB7XG4gICAgbGV0IGlzUHJvZHVjdGlvbiA9IHByb2Nlc3MuZW52LkVNQkVSX0VOViA9PT0gJ3Byb2R1Y3Rpb24nO1xuXG4gICAgbGV0IGpzVHJlZSA9IHRoaXMuamF2YXNjcmlwdFRyZWUoKTtcbiAgICBsZXQgY3NzVHJlZSA9IHRoaXMuY3NzVHJlZSgpO1xuICAgIGxldCBwdWJsaWNUcmVlID0gdGhpcy5wdWJsaWNUcmVlKCk7XG4gICAgbGV0IGh0bWxUcmVlID0gdGhpcy5odG1sVHJlZSgpO1xuXG4gICAgLy8gTWluaWZ5IHRoZSBKYXZhU2NyaXB0IGluIHByb2R1Y3Rpb24gYnVpbGRzLlxuICAgIGlmIChpc1Byb2R1Y3Rpb24pIHtcbiAgICAgIGpzVHJlZSA9IHRoaXMubWluaWZ5VHJlZShqc1RyZWUpO1xuICAgIH1cblxuICAgIGxldCB0cmVlcyA9IFtqc1RyZWUsIGh0bWxUcmVlXTtcbiAgICBpZiAoY3NzVHJlZSkge1xuICAgICAgdHJlZXMucHVzaChjc3NUcmVlKTtcbiAgICB9XG4gICAgaWYgKHB1YmxpY1RyZWUpIHtcbiAgICAgIHRyZWVzLnB1c2gocHVibGljVHJlZSk7XG4gICAgfVxuXG4gICAgbGV0IGFwcFRyZWUgPSBtZXJnZSh0cmVlcyk7XG5cbiAgICAvLyBGaW5nZXJwcmludCBhc3NldHMgZm9yIGNhY2hlIGJ1c3RpbmcgaW4gcHJvZHVjdGlvbi5cbiAgICAvKlxuICAgICBEaXNhYmxlIGFzc2V0LXJldiB1bnRpbCBpdCdzIHBvc3NpYmxlIHRvIGdlbmVyYXRlIGFzc2V0LW1hcFxuICAgICBpbiBHbGltbWVyIGFwcHMuXG4gICAgaWYgKGlzUHJvZHVjdGlvbikge1xuICAgICAgbGV0IGV4dGVuc2lvbnMgPSBbJ2pzJywgJ2NzcyddO1xuICAgICAgbGV0IHJlcGxhY2VFeHRlbnNpb25zID0gWydodG1sJywgJ2pzJywgJ2NzcyddO1xuICAgICAgbGV0IGV4Y2x1ZGUgPSBbJ3N3LmpzJywgJ3dlYi1hbmltYXRpb25zLm1pbi5qcyddO1xuXG4gICAgICBhcHBUcmVlID0gYXNzZXRSZXYoYXBwVHJlZSwge1xuICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgICAgZXhjbHVkZSxcbiAgICAgICAgZXh0ZW5zaW9ucyxcbiAgICAgICAgcmVwbGFjZUV4dGVuc2lvbnNcbiAgICAgIH0pO1xuICAgIH1cbiAgICAqL1xuXG4gICAgcmV0dXJuIGFwcFRyZWU7XG4gIH1cblxuICBqYXZhc2NyaXB0VHJlZSgpIHtcbiAgICBsZXQgeyBzcmNUcmVlLCBub2RlTW9kdWxlc1RyZWUgfSA9IHRoaXMudHJlZXM7XG5cbiAgICAvLyBHcmFiIHRoZSBhcHAncyBgc3JjYCBkaXJlY3RvcnkuXG4gICAgc3JjVHJlZSA9IGZpbmQoc3JjVHJlZSwge1xuICAgICAgZGVzdERpcjogJ3NyYydcbiAgICB9KTtcblxuICAgIC8vIENvbXBpbGUgdGhlIFR5cGVTY3JpcHQgYW5kIEhhbmRsZWJhcnMgZmlsZXMgaW50byBKYXZhU2NyaXB0XG4gICAgY29uc3QgY29tcGlsZWRIYW5kbGViYXJzVHJlZSA9IHRoaXMuY29tcGlsZWRIYW5kbGViYXJzVHJlZShzcmNUcmVlKTtcbiAgICBjb25zdCBjb21waWxlZFR5cGVTY3JpcHRUcmVlID0gdGhpcy5jb21waWxlZFR5cGVTY3JpcHRUcmVlKHNyY1RyZWUsIG5vZGVNb2R1bGVzVHJlZSlcblxuICAgIC8vIFJlbW92ZSB0b3AtbW9zdCBgc3JjYCBkaXJlY3Rvcnkgc28gbW9kdWxlIG5hbWVzIGRvbid0IGluY2x1ZGUgaXQuXG4gICAgY29uc3QgcmVzb2x2YWJsZVRyZWUgPSBmaW5kKG1lcmdlKFtjb21waWxlZFR5cGVTY3JpcHRUcmVlLCBjb21waWxlZEhhbmRsZWJhcnNUcmVlXSksIHtcbiAgICAgIHNyY0RpcjogJ3NyYydcbiAgICB9KTtcblxuICAgIC8vIEJ1aWxkIHRoZSBmaWxlIHRoYXQgbWFwcyBpbmRpdmlkdWFsIG1vZHVsZXMgb250byB0aGUgcmVzb2x2ZXIncyBzcGVjaWZpZXJcbiAgICAvLyBrZXlzLlxuICAgIGNvbnN0IG1vZHVsZU1hcCA9IHRoaXMuYnVpbGRSZXNvbHV0aW9uTWFwKHJlc29sdmFibGVUcmVlKTtcblxuICAgIC8vIEJ1aWxkIHRoZSByZXNvbHZlciBjb25maWd1cmF0aW9uIGZpbGUuXG4gICAgY29uc3QgcmVzb2x2ZXJDb25maWd1cmF0aW9uID0gdGhpcy5idWlsZFJlc29sdmVyQ29uZmlndXJhdGlvbigpO1xuXG4gICAgLy8gTWVyZ2UgdGhlIEphdmFTY3JpcHQgc291cmNlIGFuZCBnZW5lcmF0ZWQgbW9kdWxlIG1hcCBhbmQgcmVzb2x2ZXJcbiAgICAvLyBjb25maWd1cmF0aW9uIGZpbGVzIHRvZ2V0aGVyLCBtYWtpbmcgc3VyZSB0byBvdmVyd3JpdGUgdGhlIHN0dWJcbiAgICAvLyBtb2R1bGUtbWFwLmpzIGFuZCByZXNvbHZlci1jb25maWd1cmF0aW9uLmpzIGluIHRoZSBzb3VyY2UgdHJlZSB3aXRoIHRoZVxuICAgIC8vIGdlbmVyYXRlZCBvbmVzLlxuICAgIGxldCBqc1RyZWUgPSBtZXJnZShbXG4gICAgICByZXNvbHZhYmxlVHJlZSxcbiAgICAgIG1vZHVsZU1hcCxcbiAgICAgIHJlc29sdmVyQ29uZmlndXJhdGlvblxuICAgIF0sIHsgb3ZlcndyaXRlOiB0cnVlIH0pO1xuXG4gICAgLy8gRmluYWxseSwgYnVuZGxlIHRoZSBhcHAgaW50byBhIHNpbmdsZSByb2xsZWQgdXAgLmpzIGZpbGUuXG4gICAgcmV0dXJuIHRoaXMucm9sbHVwVHJlZShqc1RyZWUpO1xuICB9XG5cbiAgY29tcGlsZWRUeXBlU2NyaXB0VHJlZShzcmNUcmVlLCBub2RlTW9kdWxlc1RyZWUpOiBUeXBlU2NyaXB0IHtcbiAgICBjb25zdCB0c09wdGlvbnMgPSB0aGlzLnRzT3B0aW9ucygpO1xuXG4gICAgbGV0IGlucHV0VHJlZXMgPSBtZXJnZShbbm9kZU1vZHVsZXNUcmVlLCBzcmNUcmVlXSk7XG5cbiAgICByZXR1cm4gdHlwZXNjcmlwdChpbnB1dFRyZWVzLCB0c09wdGlvbnMpO1xuICB9XG5cbiAgY29tcGlsZWRIYW5kbGViYXJzVHJlZShzcmNUcmVlKSB7XG4gICAgbGV0IGhic1RyZWUgPSBmaW5kKHNyY1RyZWUsIHtcbiAgICAgIGluY2x1ZGU6IFsnc3JjLyoqLyouaGJzJ11cbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgR2xpbW1lclRlbXBsYXRlUHJlY29tcGlsZXIoaGJzVHJlZSwge1xuICAgICAgcm9vdE5hbWU6IHRoaXMucHJvamVjdC5wa2cubmFtZVxuICAgIH0pO1xuICB9XG5cbiAgcm9sbHVwVHJlZShqc1RyZWUpIHtcbiAgICByZXR1cm4gbmV3IFJvbGx1cFdpdGhEZXBlbmRlbmNpZXMoanNUcmVlLCB7XG4gICAgICBpbnB1dEZpbGVzOiBbJyoqLyouanMnXSxcbiAgICAgIHJvbGx1cDoge1xuICAgICAgICBmb3JtYXQ6ICd1bWQnLFxuICAgICAgICBlbnRyeTogJ2luZGV4LmpzJyxcbiAgICAgICAgZGVzdDogJ2FwcC5qcycsXG4gICAgICAgIHNvdXJjZU1hcDogJ2lubGluZSdcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIG1pbmlmeVRyZWUoanNUcmVlKSB7XG4gICAgcmV0dXJuIHVnbGlmeShqc1RyZWUsIHtcbiAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgIHNjcmV3X2llODogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBzb3VyY2VNYXBDb25maWc6IHtcbiAgICAgICAgZW5hYmxlZDogZmFsc2VcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJld3JpdGVDb25maWdFbnZpcm9ubWVudChzcmMpIHtcbiAgICByZXR1cm4gbmV3IENvbmZpZ1JlcGxhY2Uoc3JjLCB0aGlzLl9jb25maWdUcmVlKCksIHtcbiAgICAgIGNvbmZpZ1BhdGg6IHRoaXMuX2NvbmZpZ1BhdGgoKSxcbiAgICAgIGZpbGVzOiBbICdjb25maWcvZW52aXJvbm1lbnQuanMnIF0sXG4gICAgICBwYXR0ZXJuczogdGhpcy5fY29uZmlnUmVwbGFjZVBhdHRlcm5zKClcbiAgICB9KTtcbiAgfVxuXG4gIGJ1aWxkUmVzb2x1dGlvbk1hcChzcmMpIHtcbiAgICBzcmMgPSBmaW5kKHNyYywge1xuICAgICAgZXhjbHVkZTogWydjb25maWcvKiovKiddXG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFJlc29sdXRpb25NYXBCdWlsZGVyKHNyYywgdGhpcy5fY29uZmlnVHJlZSgpLCB7XG4gICAgICBjb25maWdQYXRoOiB0aGlzLl9jb25maWdQYXRoKCksXG4gICAgICBkZWZhdWx0TW9kdWxlUHJlZml4OiB0aGlzLm5hbWUsXG4gICAgICBkZWZhdWx0TW9kdWxlQ29uZmlndXJhdGlvblxuICAgIH0pO1xuICB9XG5cbiAgYnVpbGRSZXNvbHZlckNvbmZpZ3VyYXRpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNvbHZlckNvbmZpZ3VyYXRpb25CdWlsZGVyKHRoaXMuX2NvbmZpZ1RyZWUoKSwge1xuICAgICAgY29uZmlnUGF0aDogdGhpcy5fY29uZmlnUGF0aCgpLFxuICAgICAgZGVmYXVsdE1vZHVsZVByZWZpeDogdGhpcy5uYW1lLFxuICAgICAgZGVmYXVsdE1vZHVsZUNvbmZpZ3VyYXRpb25cbiAgICB9KTtcbiAgfVxuXG4gIGNzc1RyZWUoKSB7XG4gICAgbGV0IHN0eWxlc1BhdGggPSBwYXRoLmpvaW4odGhpcy5zcmNQYXRoLCAndWknLCAnc3R5bGVzJyk7XG5cbiAgICBpZiAoZnMuZXhpc3RzU3luYyhzdHlsZXNQYXRoKSkge1xuICAgICAgLy8gQ29tcGlsZSBTQVNTIGlmIGFwcC5zY3NzIGlzIHByZXNlbnRcbiAgICAgIC8vICh0aGlzIHdvcmtzIHdpdGggaW1wb3J0cyBmcm9tIGFwcC5zY3NzKVxuICAgICAgbGV0IHNjc3NQYXRoID0gcGF0aC5qb2luKHN0eWxlc1BhdGgsICdhcHAuc2NzcycpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoc2Nzc1BhdGgpKSB7XG4gICAgICAgIHJldHVybiBjb21waWxlU2Fzcyhbc3R5bGVzUGF0aF0sICdhcHAuc2NzcycsICdhcHAuY3NzJywge1xuICAgICAgICAgIGFubm90YXRpb246ICdGdW5uZWw6IHNjc3MnXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBPdGhlcndpc2UgY29uY2F0IGFsbCB0aGUgY3NzIGluIHRoZSBzdHlsZXMgZGlyXG4gICAgICByZXR1cm4gY29uY2F0KG5ldyBGdW5uZWwoc3R5bGVzUGF0aCwge1xuICAgICAgICBpbmNsdWRlOiBbJyoqLyouY3NzJ10sXG4gICAgICAgIGFubm90YXRpb246ICdGdW5uZWw6IGNzcyd9KSxcbiAgICAgICAgeyBvdXRwdXRGaWxlOiAnYXBwLmNzcycgfSk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljVHJlZSgpIHtcbiAgICBsZXQgcHVibGljUGF0aCA9ICdwdWJsaWMnO1xuXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocHVibGljUGF0aCkpIHtcbiAgICAgIHJldHVybiBuZXcgRnVubmVsKHB1YmxpY1BhdGgsIHtcbiAgICAgICAgYW5ub3RhdGlvbjogJ0Z1bm5lbDogcHVibGljJ1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgaHRtbFRyZWUoKSB7XG4gICAgbGV0IHNyY1RyZWUgPSB0aGlzLnRyZWVzLnNyY1RyZWU7XG5cbiAgICBjb25zdCBodG1sTmFtZSA9IHRoaXMub3B0aW9ucy5vdXRwdXRQYXRocy5hcHAuaHRtbDtcbiAgICBjb25zdCBmaWxlcyA9IFtcbiAgICAgICd1aS9pbmRleC5odG1sJ1xuICAgIF07XG5cbiAgICBjb25zdCBpbmRleCA9IG5ldyBGdW5uZWwoc3JjVHJlZSwge1xuICAgICAgZmlsZXMsXG4gICAgICBnZXREZXN0aW5hdGlvblBhdGgocmVsYXRpdmVQYXRoKSB7XG4gICAgICAgIGlmIChyZWxhdGl2ZVBhdGggPT09ICd1aS9pbmRleC5odG1sJykge1xuICAgICAgICAgIHJlbGF0aXZlUGF0aCA9IGh0bWxOYW1lO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWxhdGl2ZVBhdGg7XG4gICAgICB9LFxuICAgICAgYW5ub3RhdGlvbjogJ0Z1bm5lbDogaW5kZXguaHRtbCdcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgQ29uZmlnUmVwbGFjZShpbmRleCwgdGhpcy5fY29uZmlnVHJlZSgpLCB7XG4gICAgICBjb25maWdQYXRoOiB0aGlzLl9jb25maWdQYXRoKCksXG4gICAgICBmaWxlczogWyBodG1sTmFtZSBdLFxuICAgICAgcGF0dGVybnM6IHRoaXMuX2NvbmZpZ1JlcGxhY2VQYXR0ZXJucygpXG4gICAgfSk7XG4gIH1cblxuICBjb250ZW50Rm9yKGNvbmZpZywgbWF0Y2g6IFJlZ0V4cCwgdHlwZTogc3RyaW5nKSB7XG4gICAgbGV0IGNvbnRlbnQ6IHN0cmluZ1tdID0gW107XG5cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2hlYWQnOlxuICAgICAgICB0aGlzLl9jb250ZW50Rm9ySGVhZChjb250ZW50LCBjb25maWcpO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjb250ZW50ID0gPHN0cmluZ1tdPnRoaXMucHJvamVjdC5hZGRvbnMucmVkdWNlKGZ1bmN0aW9uKGNvbnRlbnQ6IHN0cmluZ1tdLCBhZGRvbjogQWRkb24pOiBzdHJpbmdbXSB7XG4gICAgICB2YXIgYWRkb25Db250ZW50ID0gYWRkb24uY29udGVudEZvciA/IGFkZG9uLmNvbnRlbnRGb3IodHlwZSwgY29uZmlnLCBjb250ZW50KSA6IG51bGw7XG4gICAgICBpZiAoYWRkb25Db250ZW50KSB7XG4gICAgICAgIHJldHVybiBjb250ZW50LmNvbmNhdChhZGRvbkNvbnRlbnQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gY29udGVudDtcbiAgICB9LCBjb250ZW50KTtcblxuICAgIHJldHVybiBjb250ZW50LmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9jb250ZW50Rm9ySGVhZChjb250ZW50OiBzdHJpbmdbXSwgY29uZmlnKSB7XG4gICAgLy8gVE9ETz9cbiAgICAvLyBjb250ZW50LnB1c2goY2FsY3VsYXRlQmFzZVRhZyhjb25maWcpKTtcblxuICAgIC8vIFRPRE8/XG4gICAgLy8gaWYgKHRoaXMub3B0aW9ucy5zdG9yZUNvbmZpZ0luTWV0YSkge1xuICAgIC8vICAgY29udGVudC5wdXNoKCc8bWV0YSBuYW1lPVwiJyArIGNvbmZpZy5tb2R1bGVQcmVmaXggKyAnL2NvbmZpZy9lbnZpcm9ubWVudFwiICcgK1xuICAgIC8vICAgICAgICAgICAgICAgJ2NvbnRlbnQ9XCInICsgZXNjYXBlKEpTT04uc3RyaW5naWZ5KGNvbmZpZykpICsgJ1wiIC8+Jyk7XG4gICAgLy8gfVxuICB9XG5cbiAgcHJvdGVjdGVkIF9jb25maWdQYXRoKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHBhdGguam9pbih0aGlzLm5hbWUsICdjb25maWcnLCAnZW52aXJvbm1lbnRzJywgdGhpcy5lbnYgKyAnLmpzb24nKTtcbiAgfVxuXG4gIF9jYWNoZWRDb25maWdUcmVlOiBhbnk7XG5cbiAgcHJvdGVjdGVkIF9jb25maWdUcmVlKCkge1xuICAgIGlmICh0aGlzLl9jYWNoZWRDb25maWdUcmVlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fY2FjaGVkQ29uZmlnVHJlZTtcbiAgICB9XG5cbiAgICBjb25zdCBjb25maWdQYXRoID0gdGhpcy5wcm9qZWN0LmNvbmZpZ1BhdGgoKTtcbiAgICBjb25zdCBjb25maWdUcmVlID0gbmV3IENvbmZpZ0xvYWRlcihwYXRoLmRpcm5hbWUoY29uZmlnUGF0aCksIHtcbiAgICAgIGVudjogdGhpcy5lbnYsXG4gICAgICBwcm9qZWN0OiB0aGlzLnByb2plY3RcbiAgICB9KTtcblxuICAgIHRoaXMuX2NhY2hlZENvbmZpZ1RyZWUgPSBuZXcgRnVubmVsKGNvbmZpZ1RyZWUsIHtcbiAgICAgIHNyY0RpcjogJy8nLFxuICAgICAgZGVzdERpcjogdGhpcy5uYW1lICsgJy9jb25maWcnLFxuICAgICAgYW5ub3RhdGlvbjogJ0Z1bm5lbCAoY29uZmlnKSdcbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzLl9jYWNoZWRDb25maWdUcmVlO1xuICB9XG59XG4iXX0=