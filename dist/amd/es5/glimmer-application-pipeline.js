define('@glimmer/application-pipeline', ['exports', 'lodash.defaultsdeep', 'broccoli-config-loader', 'broccoli-config-replace', 'broccoli-funnel', 'broccoli-concat', 'path', 'fs', 'broccoli-typescript-compiler', 'exists-sync', 'broccoli-merge-trees', 'broccoli-sass', 'broccoli-uglify-sourcemap', '@glimmer/resolution-map-builder', '@glimmer/resolver-configuration-builder', 'broccoli-rollup', 'rollup-plugin-node-resolve', 'rollup-plugin-babel', 'broccoli-persistent-filter', '@glimmer/compiler', 'broccoli-source', 'heimdalljs-logger', 'broccoli-stew'], function (exports, defaultsDeep, ConfigLoader, ConfigReplace, Funnel, concat, path, fs, broccoliTypescriptCompiler, existsSync$1, merge, compileSass, uglify, ResolutionMapBuilder, ResolverConfigurationBuilder, Rollup, nodeResolve, babel, Filter, _glimmer_compiler, broccoliSource, Logger, stew) { 'use strict';

defaultsDeep = 'default' in defaultsDeep ? defaultsDeep['default'] : defaultsDeep;
ConfigLoader = 'default' in ConfigLoader ? ConfigLoader['default'] : ConfigLoader;
ConfigReplace = 'default' in ConfigReplace ? ConfigReplace['default'] : ConfigReplace;
Funnel = 'default' in Funnel ? Funnel['default'] : Funnel;
concat = 'default' in concat ? concat['default'] : concat;
existsSync$1 = 'default' in existsSync$1 ? existsSync$1['default'] : existsSync$1;
merge = 'default' in merge ? merge['default'] : merge;
compileSass = 'default' in compileSass ? compileSass['default'] : compileSass;
uglify = 'default' in uglify ? uglify['default'] : uglify;
ResolutionMapBuilder = 'default' in ResolutionMapBuilder ? ResolutionMapBuilder['default'] : ResolutionMapBuilder;
ResolverConfigurationBuilder = 'default' in ResolverConfigurationBuilder ? ResolverConfigurationBuilder['default'] : ResolverConfigurationBuilder;
Rollup = 'default' in Rollup ? Rollup['default'] : Rollup;
nodeResolve = 'default' in nodeResolve ? nodeResolve['default'] : nodeResolve;
babel = 'default' in babel ? babel['default'] : babel;
Filter = 'default' in Filter ? Filter['default'] : Filter;
Logger = 'default' in Logger ? Logger['default'] : Logger;
stew = 'default' in stew ? stew['default'] : stew;

function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

var RollupWithDependencies = function (_Rollup) {
    _inherits(RollupWithDependencies, _Rollup);

    function RollupWithDependencies(inputNode, options) {
        _classCallCheck$1(this, RollupWithDependencies);

        return _possibleConstructorReturn(this, _Rollup.apply(this, arguments));
    }

    RollupWithDependencies.prototype.build = function build() {
        var plugins = this.rollupOptions.plugins || [];
        var inputPath = this.inputPaths[0];
        var packageJSON = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')).toString('utf8'));
        var es5 = !packageJSON.devDependencies['@glimmer/web-component'];
        plugins.push(loadWithInlineMap());
        plugins.push(babel(getBabelConfig(es5)));
        plugins.push(nodeResolve({
            jsnext: true,
            main: true
        }));
        this.rollupOptions.plugins = plugins;
        this.rollupOptions.onwarn = function (warning) {
            // Suppress known error message caused by TypeScript compiled code with Rollup
            // https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined
            if (warning.code === 'THIS_IS_UNDEFINED') {
                return;
            }
            console.log("Rollup warning: ", warning.message);
        };

        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        return Rollup.prototype.build.apply(this, args);
    };

    return RollupWithDependencies;
}(Rollup);

var SOURCE_MAPPING_DATA_URL = '//# sourceMap';
SOURCE_MAPPING_DATA_URL += 'pingURL=data:application/json;base64,';
function loadWithInlineMap() {
    return {
        load: function (id) {
            if (id.indexOf('\0') > -1) {
                return;
            }
            var code = fs.readFileSync(id, 'utf8');
            var result = {
                code: code,
                map: null
            };
            var index = code.lastIndexOf(SOURCE_MAPPING_DATA_URL);
            if (index === -1) {
                return result;
            }
            result.code = code;
            result.map = parseSourceMap(code.slice(index + SOURCE_MAPPING_DATA_URL.length));
            return result;
        }
    };
}
function parseSourceMap(base64) {
    return JSON.parse(new Buffer(base64, 'base64').toString('utf8'));
}
function getBabelConfig(es5) {
    var baseConfig = {
        presets: [],
        plugins: ['external-helpers'],
        sourceMaps: 'inline',
        retainLines: false
    };
    if (es5) {
        baseConfig.presets.push(['es2015', { modules: false }]);
    }
    return baseConfig;
}

function _defaults$1(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck$2(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn$1(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits$1(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults$1(subClass, superClass); }

var GlimmerTemplatePrecompiler = function (_Filter) {
    _inherits$1(GlimmerTemplatePrecompiler, _Filter);

    function GlimmerTemplatePrecompiler(inputNode, options) {
        _classCallCheck$2(this, GlimmerTemplatePrecompiler);

        var _this = _possibleConstructorReturn$1(this, _Filter.apply(this, arguments));

        _this.extensions = ['hbs'];
        _this.targetExtension = 'js';
        _this.options = options || {};
        return _this;
    }

    GlimmerTemplatePrecompiler.prototype.processString = function processString(content, relativePath) {
        var specifier = getTemplateSpecifier(this.options.rootName, relativePath);
        return 'export default ' + _glimmer_compiler.precompile(content, { meta: { specifier: specifier, '<template-meta>': true } }) + ';';
    };

    return GlimmerTemplatePrecompiler;
}(Filter);

function getTemplateSpecifier(rootName, relativePath) {
    var path$$1 = relativePath.split('/');
    var prefix = path$$1.shift();
    // TODO - should use module map config to be rigorous
    if (path$$1[path$$1.length - 1] === 'template.hbs') {
        path$$1.pop();
    }
    if (path$$1[0] === 'ui') {
        path$$1.shift();
    }
    return 'template:/' + rootName + '/' + path$$1.join('/');
}

var defaultModuleConfiguration = {
    types: {
        application: { definitiveCollection: 'main' },
        component: { definitiveCollection: 'components' },
        helper: { definitiveCollection: 'components' },
        renderer: { definitiveCollection: 'main' },
        template: { definitiveCollection: 'components' }
    },
    collections: {
        main: {
            types: ['application', 'renderer']
        },
        components: {
            group: 'ui',
            types: ['component', 'template', 'helper'],
            defaultType: 'component',
            privateCollections: ['utils']
        },
        styles: {
            group: 'ui',
            unresolvable: true
        },
        utils: {
            unresolvable: true
        }
    }
};

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var logger = Logger('@glimmer/application-pipeline:glimmer-app');
var find = stew.find;
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
        var srcTree = existsSync$1(srcPath) ? new broccoliSource.WatchedDir(srcPath) : null;
        var nodeModulesTree = new Funnel(new broccoliSource.UnwatchedDir(this.project.root), {
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
        if (existsSync$1(tsconfigPath)) {
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
        return broccoliTypescriptCompiler.typescript(inputTrees, tsOptions);
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

exports.GlimmerApp = GlimmerApp;

Object.defineProperty(exports, '__esModule', { value: true });

});
