"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _broccoliRollup = require("broccoli-rollup");

var _broccoliRollup2 = _interopRequireDefault(_broccoliRollup);

var _rollupPluginNodeResolve = require("rollup-plugin-node-resolve");

var _rollupPluginNodeResolve2 = _interopRequireDefault(_rollupPluginNodeResolve);

var _rollupPluginBabel = require("rollup-plugin-babel");

var _rollupPluginBabel2 = _interopRequireDefault(_rollupPluginBabel);

var _fs = require("fs");

var fs = _interopRequireWildcard(_fs);

var _path = require("path");

var path = _interopRequireWildcard(_path);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defaults(obj, defaults) {
    var keys = Object.getOwnPropertyNames(defaults);for (var i = 0; i < keys.length; i++) {
        var key = keys[i];var value = Object.getOwnPropertyDescriptor(defaults, key);if (value && value.configurable && obj[key] === undefined) {
            Object.defineProperty(obj, key, value);
        }
    }return obj;
}

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

function _possibleConstructorReturn(self, call) {
    if (!self) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass);
}

var RollupWithDependencies = function (_Rollup) {
    _inherits(RollupWithDependencies, _Rollup);

    function RollupWithDependencies(inputNode, options) {
        _classCallCheck(this, RollupWithDependencies);

        return _possibleConstructorReturn(this, _Rollup.apply(this, arguments));
    }

    RollupWithDependencies.prototype.build = function build() {
        var plugins = this.rollupOptions.plugins || [];
        var inputPath = this.inputPaths[0];
        var packageJSON = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')).toString('utf8'));
        var es5 = !packageJSON.devDependencies['@glimmer/web-component'];
        plugins.push(loadWithInlineMap());
        plugins.push((0, _rollupPluginBabel2.default)(getBabelConfig(es5)));
        plugins.push((0, _rollupPluginNodeResolve2.default)({
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

        return _broccoliRollup2.default.prototype.build.apply(this, args);
    };

    return RollupWithDependencies;
}(_broccoliRollup2.default);

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
exports.default = RollupWithDependencies;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sbHVwLXdpdGgtZGVwZW5kZW5jaWVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Jyb2Njb2xpL3JvbGx1cC13aXRoLWRlcGVuZGVuY2llcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxBQUFPLEFBQU0sQUFBTSxBQUFpQixBQUFDOzs7O0FBQ3JDLEFBQU8sQUFBVyxBQUFNLEFBQTRCLEFBQUM7Ozs7QUFDckQsQUFBTyxBQUFLLEFBQU0sQUFBcUIsQUFBQzs7OztBQUN4QyxBQUFPOztJQUFLLEFBQUUsQUFBTSxBQUFJLEFBQUM7O0FBQ3pCLEFBQU87O0lBQUssQUFBSSxBQUFNLEFBQU0sQUFBQyxBQUU3Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFBNkI7c0NBSTNCOztvQ0FBWSxBQUFTLFdBQUUsQUFBTzs7O2dEQUM1QixBQUFLLEFBQUMsb0JBQUcsQUFBUyxBQUFDLEFBQ3JCLEFBQUM7OztxQ0FFRCxBQUFLLEFBQUMseUJBQ0o7WUFBSSxBQUFPLFVBQUcsQUFBSSxLQUFDLEFBQWEsY0FBQyxBQUFPLFdBQUksQUFBRSxBQUFDLEFBQy9DO1lBQUksQUFBUyxZQUFHLEFBQUksS0FBQyxBQUFVLFdBQUMsQUFBQyxBQUFDLEFBQUMsQUFDbkM7WUFBSSxBQUFXLGNBQUcsQUFBSSxLQUFDLEFBQUssTUFBQyxBQUFFLEdBQUMsQUFBWSxhQUFDLEFBQUksS0FBQyxBQUFJLEtBQUMsQUFBTyxRQUFDLEFBQUcsQUFBRSxPQUFFLEFBQWMsQUFBQyxBQUFDLGlCQUFDLEFBQVEsU0FBQyxBQUFNLEFBQUMsQUFBQyxBQUFDLEFBQ3pHO1lBQUksQUFBRyxNQUFHLEFBQUMsQ0FBQyxBQUFXLFlBQUMsQUFBZSxnQkFBQyxBQUF3QixBQUFDLEFBQUMsQUFBQyxBQUVuRSxBQUFPO2dCQUFDLEFBQUksS0FBQyxBQUFpQixBQUFFLEFBQUMsQUFBQyxBQUVsQyxBQUFPO2dCQUFDLEFBQUksS0FBQyxBQUFLLGlDQUFD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aW1wb3J0IG5vZGVSZXNvbHZlIGZyb20gJ3JvbGx1cC1wbHVnaW4tbm9kZS1yZXNvbHZlJztcbmltcG9ydCBiYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmNsYXNzIFJvbGx1cFdpdGhEZXBlbmRlbmNpZXMgZXh0ZW5kcyBSb2xsdXAge1xuICByb2xsdXBPcHRpb25zOiBhbnk7XG4gIGlucHV0UGF0aHM6IGFueVtdO1xuXG4gIGNvbnN0cnVjdG9yKGlucHV0Tm9kZSwgb3B0aW9ucykge1xuICAgIHN1cGVyKC4uLmFyZ3VtZW50cylcbiAgfVxuXG4gIGJ1aWxkKC4uLmFyZ3MpIHtcbiAgICBsZXQgcGx1Z2lucyA9IHRoaXMucm9sbHVwT3B0aW9ucy5wbHVnaW5zIHx8IFtdO1xuICAgIGxldCBpbnB1dFBhdGggPSB0aGlzLmlucHV0UGF0aHNbMF07XG4gICAgbGV0IHBhY2thZ2VKU09OID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdwYWNrYWdlLmpzb24nKSkudG9TdHJpbmcoJ3V0ZjgnKSk7XG4gICAgbGV0IGVzNSA9ICEocGFja2FnZUpTT04uZGV2RGVwZW5kZW5jaWVzWydAZ2xpbW1lci93ZWItY29tcG9uZW50J10pO1xuXG4gICAgcGx1Z2lucy5wdXNoKGxvYWRXaXRoSW5saW5lTWFwKCkpO1xuXG4gICAgcGx1Z2lucy5wdXNoKGJhYmVsKGdldEJhYmVsQ29uZmlnKGVzNSkpKTtcblxuICAgIHBsdWdpbnMucHVzaChub2RlUmVzb2x2ZSh7XG4gICAgICBqc25leHQ6IHRydWUsXG4gICAgICBtYWluOiB0cnVlXG4gICAgfSkpO1xuXG4gICAgdGhpcy5yb2xsdXBPcHRpb25zLnBsdWdpbnMgPSBwbHVnaW5zO1xuXG4gICAgdGhpcy5yb2xsdXBPcHRpb25zLm9ud2FybiA9IGZ1bmN0aW9uKHdhcm5pbmcpIHtcbiAgICAgIC8vIFN1cHByZXNzIGtub3duIGVycm9yIG1lc3NhZ2UgY2F1c2VkIGJ5IFR5cGVTY3JpcHQgY29tcGlsZWQgY29kZSB3aXRoIFJvbGx1cFxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3JvbGx1cC9yb2xsdXAvd2lraS9Ucm91Ymxlc2hvb3RpbmcjdGhpcy1pcy11bmRlZmluZWRcbiAgICAgIGlmICh3YXJuaW5nLmNvZGUgPT09ICdUSElTX0lTX1VOREVGSU5FRCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coXCJSb2xsdXAgd2FybmluZzogXCIsIHdhcm5pbmcubWVzc2FnZSk7XG4gICAgfTtcblxuICAgIHJldHVybiBSb2xsdXAucHJvdG90eXBlLmJ1aWxkLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG59XG5cbmxldCBTT1VSQ0VfTUFQUElOR19EQVRBX1VSTCA9ICcvLyMgc291cmNlTWFwJztcblNPVVJDRV9NQVBQSU5HX0RBVEFfVVJMICs9ICdwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsJztcblxuZnVuY3Rpb24gbG9hZFdpdGhJbmxpbmVNYXAoKSB7XG4gIHJldHVybiB7XG4gICAgbG9hZDogZnVuY3Rpb24gKGlkKSB7XG4gICAgICBpZiAoaWQuaW5kZXhPZignXFwwJykgPiAtMSkgeyByZXR1cm47IH1cblxuICAgICAgdmFyIGNvZGUgPSBmcy5yZWFkRmlsZVN5bmMoaWQsICd1dGY4Jyk7XG4gICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBjb2RlOiBjb2RlLFxuICAgICAgICBtYXA6IG51bGxcbiAgICAgIH07XG4gICAgICB2YXIgaW5kZXggPSBjb2RlLmxhc3RJbmRleE9mKFNPVVJDRV9NQVBQSU5HX0RBVEFfVVJMKTtcbiAgICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5jb2RlID0gY29kZTtcbiAgICAgIHJlc3VsdC5tYXAgPSBwYXJzZVNvdXJjZU1hcChjb2RlLnNsaWNlKGluZGV4ICsgU09VUkNFX01BUFBJTkdfREFUQV9VUkwubGVuZ3RoKSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VTb3VyY2VNYXAoYmFzZTY0KSB7XG4gIHJldHVybiBKU09OLnBhcnNlKG5ldyBCdWZmZXIoYmFzZTY0LCAnYmFzZTY0JykudG9TdHJpbmcoJ3V0ZjgnKSk7XG59XG5cbmZ1bmN0aW9uIGdldEJhYmVsQ29uZmlnKGVzNSkge1xuICBsZXQgYmFzZUNvbmZpZyA9IHtcbiAgICBwcmVzZXRzOiBbXSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICAnZXh0ZXJuYWwtaGVscGVycydcbiAgICBdLFxuICAgIHNvdXJjZU1hcHM6ICdpbmxpbmUnLFxuICAgIHJldGFpbkxpbmVzOiBmYWxzZVxuICB9O1xuXG4gIGlmIChlczUpIHtcbiAgICBiYXNlQ29uZmlnLnByZXNldHMucHVzaChcbiAgICAgIFtcbiAgICAgICAgJ2VzMjAxNScsXG4gICAgICAgIHsgbW9kdWxlczogZmFsc2UgfVxuICAgICAgXVxuICAgICk7XG4gIH1cblxuICByZXR1cm4gYmFzZUNvbmZpZztcbn1cblxuZXhwb3J0IGRlZmF1bHQgUm9sbHVwV2l0aERlcGVuZGVuY2llcztcbiJdfQ==