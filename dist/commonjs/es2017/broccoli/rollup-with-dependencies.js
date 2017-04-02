'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _broccoliRollup = require('broccoli-rollup');

var _broccoliRollup2 = _interopRequireDefault(_broccoliRollup);

var _rollupPluginNodeResolve = require('rollup-plugin-node-resolve');

var _rollupPluginNodeResolve2 = _interopRequireDefault(_rollupPluginNodeResolve);

var _rollupPluginBabel = require('rollup-plugin-babel');

var _rollupPluginBabel2 = _interopRequireDefault(_rollupPluginBabel);

var _fs = require('fs');

var fs = _interopRequireWildcard(_fs);

var _path = require('path');

var path = _interopRequireWildcard(_path);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class RollupWithDependencies extends _broccoliRollup2.default {
    constructor(inputNode, options) {
        super(...arguments);
    }
    build(...args) {
        let plugins = this.rollupOptions.plugins || [];
        let inputPath = this.inputPaths[0];
        let packageJSON = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')).toString('utf8'));
        let es5 = !packageJSON.devDependencies['@glimmer/web-component'];
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
        return _broccoliRollup2.default.prototype.build.apply(this, args);
    }
}
let SOURCE_MAPPING_DATA_URL = '//# sourceMap';
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
    let baseConfig = {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sbHVwLXdpdGgtZGVwZW5kZW5jaWVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Jyb2Njb2xpL3JvbGx1cC13aXRoLWRlcGVuZGVuY2llcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxBQUFPLEFBQU0sQUFBTSxBQUFpQixBQUFDOzs7O0FBQ3JDLEFBQU8sQUFBVyxBQUFNLEFBQTRCLEFBQUM7Ozs7QUFDckQsQUFBTyxBQUFLLEFBQU0sQUFBcUIsQUFBQzs7OztBQUN4QyxBQUFPOztJQUFLLEFBQUUsQUFBTSxBQUFJLEFBQUM7O0FBQ3pCLEFBQU87O0lBQUssQUFBSSxBQUFNLEFBQU0sQUFBQzs7Ozs7O0FBRTdCLE1BQTZCLEFBQVEsQUFBTTtBQUl6QyxnQkFBWSxBQUFTLFdBQUUsQUFBTztBQUM1QixBQUFLLGNBQUMsR0FBRyxBQUFTLEFBQUMsQUFDckI7QUFBQztBQUVELEFBQUssVUFBQyxHQUFHLEFBQUk7QUFDWCxZQUFJLEFBQU8sVUFBRyxBQUFJLEtBQUMsQUFBYSxjQUFDLEFBQU8sV0FBSSxBQUFFLEFBQUM7QUFDL0MsWUFBSSxBQUFTLFlBQUcsQUFBSSxLQUFDLEFBQVUsV0FBQyxBQUFDLEFBQUMsQUFBQztBQUNuQyxZQUFJLEFBQVcsY0FBRyxBQUFJLEtBQUMsQUFBSyxNQUFDLEFBQUUsR0FBQyxBQUFZLGFBQUMsQUFBSSxLQUFDLEFBQUksS0FBQyxBQUFPLFFBQUMsQUFBRyxBQUFFLE9BQUUsQUFBYyxBQUFDLEFBQUMsaUJBQUMsQUFBUSxTQUFDLEFBQU0sQUFBQyxBQUFDLEFBQUM7QUFDekcsWUFBSSxBQUFHLE1BQUcsQUFBQyxDQUFDLEFBQVcsWUFBQyxBQUFlLGdCQUFDLEFBQXdCLEFBQUMsQUFBQyxBQUFDO0FBRW5FLEFBQU8sZ0JBQUMsQUFBSSxLQUFDLEFBQWlCLEFBQUUsQUFBQyxBQUFDO0FBRWxDLEFBQU8sZ0JBQUMsQUFBSSxLQUFDLEFBQUssaUNBQUMsQUFBYyxlQUFDLEFBQUcsQUFBQyxBQUFDLEFBQUMsQUFBQztBQUV6QyxBQUFPLGdCQUFDLEFBQUk7QUFDVixBQUFNLG9CQUFFLEFBQUk7QUFDWixBQUFJLGtCQUFFLEFBQUksQUFDWCxBQUFDLEFBQUMsQUFBQztBQUhxQixTQUFaLEFBQVc7QUFLeEIsQUFBSSxhQUFDLEFBQWEsY0FBQyxBQUFPLFVBQUcsQUFBTyxBQUFDO0FBRXJDLEFBQUksYUFBQyxBQUFhLGNBQUMsQUFBTSxTQUFHLFVBQVMsQUFBTztBQUMxQyxBQUE4RTtBQUM5RSxBQUEwRTtBQUMxRSxBQUFFLEFBQUMsZ0JBQUMsQUFBTyxRQUFDLEFBQUksU0FBSyxBQUFtQixBQUFDLHFCQUFDLEFBQUM7QUFDekMsQUFBTSxBQUFDLEFBQ1Q7QUFBQztBQUNELEFBQU8sb0JBQUMsQUFBRyxJQUFDLEFBQWtCLG9CQUFFLEFBQU8sUUFBQyxBQUFPLEFBQUMsQUFBQyxBQUNuRDtBQUFDLEFBQUM7QUFFRixBQUFNLGVBQUMsQUFBTSx5QkFBQyxBQUFTLFVBQUMsQUFBSyxNQUFDLEFBQUssTUFBQyxBQUFJLE1BQUUsQUFBSSxBQUFDLEFBQUMsQUFDbEQ7QUFBQyxBQUNGOztBQUVELElBQUksQUFBdUIsMEJBQUcsQUFBZSxBQUFDO0FBQzlDLEFBQXVCLDJCQUFJLEFBQXVDLEFBQUM7QUFFbkU7QUFDRSxBQUFNO0FBQ0osQUFBSSxjQUFFLFVBQVUsQUFBRTtBQUNoQixBQUFFLEFBQUMsZ0JBQUMsQUFBRSxHQUFDLEFBQU8sUUFBQyxBQUFJLEFBQUMsUUFBRyxDQUFDLEFBQUMsQUFBQyxHQUFDLEFBQUM7QUFBQyxBQUFNLEFBQUMsQUFBQztBQUFDO0FBRXRDLGdCQUFJLEFBQUksT0FBRyxBQUFFLEdBQUMsQUFBWSxhQUFDLEFBQUUsSUFBRSxBQUFNLEFBQUMsQUFBQztBQUN2QyxnQkFBSSxBQUFNO0FBQ1IsQUFBSSxzQkFBRSxBQUFJO0FBQ1YsQUFBRyxxQkFBRSxBQUFJLEFBQ1YsQUFBQztBQUhXO0FBSWIsZ0JBQUksQUFBSyxRQUFHLEFBQUksS0FBQyxBQUFXLFlBQUMsQUFBdUIsQUFBQyxBQUFDO0FBQ3RELEFBQUUsQUFBQyxnQkFBQyxBQUFLLFVBQUssQ0FBQyxBQUFDLEFBQUMsR0FBQyxBQUFDO0FBQ2pCLEFBQU0sdUJBQUMsQUFBTSxBQUFDLEFBQ2hCO0FBQUM7QUFDRCxBQUFNLG1CQUFDLEFBQUksT0FBRyxBQUFJLEFBQUM7QUFDbkIsQUFBTSxtQkFBQyxBQUFHLE1BQUcsQUFBYyxlQUFDLEFBQUksS0FBQyxBQUFLLE1BQUMsQUFBSyxRQUFHLEFBQXVCLHdCQUFDLEFBQU0sQUFBQyxBQUFDLEFBQUM7QUFDaEYsQUFBTSxtQkFBQyxBQUFNLEFBQUMsQUFDaEI7QUFBQyxBQUNGLEFBQUMsQUFDSjtBQWxCUztBQWtCUjtBQUVELHdCQUF3QixBQUFNO0FBQzVCLEFBQU0sV0FBQyxBQUFJLEtBQUMsQUFBSyxNQUFDLElBQUksQUFBTSxPQUFDLEFBQU0sUUFBRSxBQUFRLEFBQUMsVUFBQyxBQUFRLFNBQUMsQUFBTSxBQUFDLEFBQUMsQUFBQyxBQUNuRTtBQUFDO0FBRUQsd0JBQXdCLEFBQUc7QUFDekIsUUFBSSxBQUFVO0FBQ1osQUFBTyxpQkFBRSxBQUFFO0FBQ1gsQUFBTyxpQkFBRSxDQUNQLEFBQWtCLEFBQ25CO0FBQ0QsQUFBVSxvQkFBRSxBQUFRO0FBQ3BCLEFBQVcscUJBQUUsQUFBSyxBQUNuQixBQUFDO0FBUGU7QUFTakIsQUFBRSxBQUFDLFFBQUMsQUFBRyxBQUFDLEtBQUMsQUFBQztBQUNSLEFBQVUsbUJBQUMsQUFBTyxRQUFDLEFBQUksS0FDckIsQ0FDRSxBQUFRLFVBQ1IsRUFBRSxBQUFPLFNBQUUsQUFBSyxBQUFFLEFBQ25CLEFBQ0YsQUFBQyxBQUNKO0FBQUM7QUFFRCxBQUFNLFdBQUMsQUFBVSxBQUFDLEFBQ3BCO0FBQUMsQUFFRDtrQkFBZSxBQUFzQixBQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJvbGx1cCBmcm9tICdicm9jY29saS1yb2xsdXAnO1xuaW1wb3J0IG5vZGVSZXNvbHZlIGZyb20gJ3JvbGx1cC1wbHVnaW4tbm9kZS1yZXNvbHZlJztcbmltcG9ydCBiYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmNsYXNzIFJvbGx1cFdpdGhEZXBlbmRlbmNpZXMgZXh0ZW5kcyBSb2xsdXAge1xuICByb2xsdXBPcHRpb25zOiBhbnk7XG4gIGlucHV0UGF0aHM6IGFueVtdO1xuXG4gIGNvbnN0cnVjdG9yKGlucHV0Tm9kZSwgb3B0aW9ucykge1xuICAgIHN1cGVyKC4uLmFyZ3VtZW50cylcbiAgfVxuXG4gIGJ1aWxkKC4uLmFyZ3MpIHtcbiAgICBsZXQgcGx1Z2lucyA9IHRoaXMucm9sbHVwT3B0aW9ucy5wbHVnaW5zIHx8IFtdO1xuICAgIGxldCBpbnB1dFBhdGggPSB0aGlzLmlucHV0UGF0aHNbMF07XG4gICAgbGV0IHBhY2thZ2VKU09OID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdwYWNrYWdlLmpzb24nKSkudG9TdHJpbmcoJ3V0ZjgnKSk7XG4gICAgbGV0IGVzNSA9ICEocGFja2FnZUpTT04uZGV2RGVwZW5kZW5jaWVzWydAZ2xpbW1lci93ZWItY29tcG9uZW50J10pO1xuXG4gICAgcGx1Z2lucy5wdXNoKGxvYWRXaXRoSW5saW5lTWFwKCkpO1xuXG4gICAgcGx1Z2lucy5wdXNoKGJhYmVsKGdldEJhYmVsQ29uZmlnKGVzNSkpKTtcblxuICAgIHBsdWdpbnMucHVzaChub2RlUmVzb2x2ZSh7XG4gICAgICBqc25leHQ6IHRydWUsXG4gICAgICBtYWluOiB0cnVlXG4gICAgfSkpO1xuXG4gICAgdGhpcy5yb2xsdXBPcHRpb25zLnBsdWdpbnMgPSBwbHVnaW5zO1xuXG4gICAgdGhpcy5yb2xsdXBPcHRpb25zLm9ud2FybiA9IGZ1bmN0aW9uKHdhcm5pbmcpIHtcbiAgICAgIC8vIFN1cHByZXNzIGtub3duIGVycm9yIG1lc3NhZ2UgY2F1c2VkIGJ5IFR5cGVTY3JpcHQgY29tcGlsZWQgY29kZSB3aXRoIFJvbGx1cFxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3JvbGx1cC9yb2xsdXAvd2lraS9Ucm91Ymxlc2hvb3RpbmcjdGhpcy1pcy11bmRlZmluZWRcbiAgICAgIGlmICh3YXJuaW5nLmNvZGUgPT09ICdUSElTX0lTX1VOREVGSU5FRCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coXCJSb2xsdXAgd2FybmluZzogXCIsIHdhcm5pbmcubWVzc2FnZSk7XG4gICAgfTtcblxuICAgIHJldHVybiBSb2xsdXAucHJvdG90eXBlLmJ1aWxkLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG59XG5cbmxldCBTT1VSQ0VfTUFQUElOR19EQVRBX1VSTCA9ICcvLyMgc291cmNlTWFwJztcblNPVVJDRV9NQVBQSU5HX0RBVEFfVVJMICs9ICdwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsJztcblxuZnVuY3Rpb24gbG9hZFdpdGhJbmxpbmVNYXAoKSB7XG4gIHJldHVybiB7XG4gICAgbG9hZDogZnVuY3Rpb24gKGlkKSB7XG4gICAgICBpZiAoaWQuaW5kZXhPZignXFwwJykgPiAtMSkgeyByZXR1cm47IH1cblxuICAgICAgdmFyIGNvZGUgPSBmcy5yZWFkRmlsZVN5bmMoaWQsICd1dGY4Jyk7XG4gICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBjb2RlOiBjb2RlLFxuICAgICAgICBtYXA6IG51bGxcbiAgICAgIH07XG4gICAgICB2YXIgaW5kZXggPSBjb2RlLmxhc3RJbmRleE9mKFNPVVJDRV9NQVBQSU5HX0RBVEFfVVJMKTtcbiAgICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5jb2RlID0gY29kZTtcbiAgICAgIHJlc3VsdC5tYXAgPSBwYXJzZVNvdXJjZU1hcChjb2RlLnNsaWNlKGluZGV4ICsgU09VUkNFX01BUFBJTkdfREFUQV9VUkwubGVuZ3RoKSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VTb3VyY2VNYXAoYmFzZTY0KSB7XG4gIHJldHVybiBKU09OLnBhcnNlKG5ldyBCdWZmZXIoYmFzZTY0LCAnYmFzZTY0JykudG9TdHJpbmcoJ3V0ZjgnKSk7XG59XG5cbmZ1bmN0aW9uIGdldEJhYmVsQ29uZmlnKGVzNSkge1xuICBsZXQgYmFzZUNvbmZpZyA9IHtcbiAgICBwcmVzZXRzOiBbXSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICAnZXh0ZXJuYWwtaGVscGVycydcbiAgICBdLFxuICAgIHNvdXJjZU1hcHM6ICdpbmxpbmUnLFxuICAgIHJldGFpbkxpbmVzOiBmYWxzZVxuICB9O1xuXG4gIGlmIChlczUpIHtcbiAgICBiYXNlQ29uZmlnLnByZXNldHMucHVzaChcbiAgICAgIFtcbiAgICAgICAgJ2VzMjAxNScsXG4gICAgICAgIHsgbW9kdWxlczogZmFsc2UgfVxuICAgICAgXVxuICAgICk7XG4gIH1cblxuICByZXR1cm4gYmFzZUNvbmZpZztcbn1cblxuZXhwb3J0IGRlZmF1bHQgUm9sbHVwV2l0aERlcGVuZGVuY2llcztcbiJdfQ==