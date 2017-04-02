function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

import Rollup from 'broccoli-rollup';
import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import * as fs from 'fs';
import * as path from 'path';

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
export default RollupWithDependencies;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sbHVwLXdpdGgtZGVwZW5kZW5jaWVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Jyb2Njb2xpL3JvbGx1cC13aXRoLWRlcGVuZGVuY2llcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBLE9BQU8sQUFBTSxZQUFNLEFBQWlCLEFBQUM7QUFDckMsT0FBTyxBQUFXLGlCQUFNLEFBQTRCLEFBQUM7QUFDckQsT0FBTyxBQUFLLFdBQU0sQUFBcUIsQUFBQztBQUN4QyxPQUFPLEtBQUssQUFBRSxRQUFNLEFBQUksQUFBQztBQUN6QixPQUFPLEtBQUssQUFBSSxVQUFNLEFBQU0sQUFBQyxBQUU3Qjs7SUFBNkI7OztBQUkzQixvQ0FBWSxBQUFTLFdBQUUsQUFBTzs7O2dEQUM1QixBQUFLLEFBQUMsb0JBQUcsQUFBUyxBQUFDLEFBQ3JCO0FBQUM7O3FDQUVELEFBQUssQUFBQztBQUNKLFlBQUksQUFBTyxVQUFHLEFBQUksS0FBQyxBQUFhLGNBQUMsQUFBTyxXQUFJLEFBQUUsQUFBQztBQUMvQyxZQUFJLEFBQVMsWUFBRyxBQUFJLEtBQUMsQUFBVSxXQUFDLEFBQUMsQUFBQyxBQUFDO0FBQ25DLFlBQUksQUFBVyxjQUFHLEFBQUksS0FBQyxBQUFLLE1BQUMsQUFBRSxHQUFDLEFBQVksYUFBQyxBQUFJLEtBQUMsQUFBSSxLQUFDLEFBQU8sUUFBQyxBQUFHLEFBQUUsT0FBRSxBQUFjLEFBQUMsQUFBQyxpQkFBQyxBQUFRLFNBQUMsQUFBTSxBQUFDLEFBQUMsQUFBQztBQUN6RyxZQUFJLEFBQUcsTUFBRyxBQUFDLENBQUMsQUFBVyxZQUFDLEFBQWUsZ0JBQUMsQUFBd0IsQUFBQyxBQUFDLEFBQUM7QUFFbkUsQUFBTyxnQkFBQyxBQUFJLEtBQUMsQUFBaUIsQUFBRSxBQUFDLEFBQUM7QUFFbEMsQUFBTyxnQkFBQyxBQUFJLEtBQUMsQUFBSyxNQUFDLEFBQWMsZUFBQyxBQUFHLEFBQUMsQUFBQyxBQUFDLEFBQUM7QUFFekMsQUFBTyxnQkFBQyxBQUFJO0FBQ1YsQUFBTSxvQkFBRSxBQUFJO0FBQ1osQUFBSSxrQkFBRSxBQUFJLEFBQ1gsQUFBQyxBQUFDLEFBQUM7QUFIcUIsU0FBWixBQUFXO0FBS3hCLEFBQUksYUFBQyxBQUFhLGNBQUMsQUFBTyxVQUFHLEFBQU8sQUFBQztBQUVyQyxBQUFJLGFBQUMsQUFBYSxjQUFDLEFBQU0sU0FBRyxVQUFTLEFBQU87QUFDMUMsQUFBOEU7QUFDOUUsQUFBMEU7QUFDMUUsQUFBRSxBQUFDLGdCQUFDLEFBQU8sUUFBQyxBQUFJLFNBQUssQUFBbUIsQUFBQyxxQkFBQyxBQUFDO0FBQ3pDLEFBQU0sQUFBQyxBQUNUO0FBQUM7QUFDRCxBQUFPLG9CQUFDLEFBQUcsSUFBQyxBQUFrQixvQkFBRSxBQUFPLFFBQUMsQUFBTyxBQUFDLEFBQUMsQUFDbkQ7QUFBQyxBQUFDOzs7QUF4QkssQUFBSTs7O0FBMEJYLEFBQU0sZUFBQyxBQUFNLE9BQUMsQUFBUyxVQUFDLEFBQUssTUFBQyxBQUFLLE1BQUMsQUFBSSxNQUFFLEFBQUksQUFBQyxBQUFDLEFBQ2xEO0FBQUMsQUFDRjs7O0VBcENvQyxBQUFNOztBQXNDM0MsSUFBSSxBQUF1QiwwQkFBRyxBQUFlLEFBQUM7QUFDOUMsQUFBdUIsMkJBQUksQUFBdUMsQUFBQztBQUVuRTtBQUNFLEFBQU07QUFDSixBQUFJLGNBQUUsVUFBVSxBQUFFO0FBQ2hCLEFBQUUsQUFBQyxnQkFBQyxBQUFFLEdBQUMsQUFBTyxRQUFDLEFBQUksQUFBQyxRQUFHLENBQUMsQUFBQyxBQUFDLEdBQUMsQUFBQztBQUFDLEFBQU0sQUFBQyxBQUFDO0FBQUM7QUFFdEMsZ0JBQUksQUFBSSxPQUFHLEFBQUUsR0FBQyxBQUFZLGFBQUMsQUFBRSxJQUFFLEFBQU0sQUFBQyxBQUFDO0FBQ3ZDLGdCQUFJLEFBQU07QUFDUixBQUFJLHNCQUFFLEFBQUk7QUFDVixBQUFHLHFCQUFFLEFBQUksQUFDVixBQUFDO0FBSFc7QUFJYixnQkFBSSxBQUFLLFFBQUcsQUFBSSxLQUFDLEFBQVcsWUFBQyxBQUF1QixBQUFDLEFBQUM7QUFDdEQsQUFBRSxBQUFDLGdCQUFDLEFBQUssVUFBSyxDQUFDLEFBQUMsQUFBQyxHQUFDLEFBQUM7QUFDakIsQUFBTSx1QkFBQyxBQUFNLEFBQUMsQUFDaEI7QUFBQztBQUNELEFBQU0sbUJBQUMsQUFBSSxPQUFHLEFBQUksQUFBQztBQUNuQixBQUFNLG1CQUFDLEFBQUcsTUFBRyxBQUFjLGVBQUMsQUFBSSxLQUFDLEFBQUssTUFBQyxBQUFLLFFBQUcsQUFBdUIsd0JBQUMsQUFBTSxBQUFDLEFBQUMsQUFBQztBQUNoRixBQUFNLG1CQUFDLEFBQU0sQUFBQyxBQUNoQjtBQUFDLEFBQ0YsQUFBQyxBQUNKO0FBbEJTO0FBa0JSO0FBRUQsd0JBQXdCLEFBQU07QUFDNUIsQUFBTSxXQUFDLEFBQUksS0FBQyxBQUFLLE1BQUMsSUFBSSxBQUFNLE9BQUMsQUFBTSxRQUFFLEFBQVEsQUFBQyxVQUFDLEFBQVEsU0FBQyxBQUFNLEFBQUMsQUFBQyxBQUFDLEFBQ25FO0FBQUM7QUFFRCx3QkFBd0IsQUFBRztBQUN6QixRQUFJLEFBQVU7QUFDWixBQUFPLGlCQUFFLEFBQUU7QUFDWCxBQUFPLGlCQUFFLENBQ1AsQUFBa0IsQUFDbkI7QUFDRCxBQUFVLG9CQUFFLEFBQVE7QUFDcEIsQUFBVyxxQkFBRSxBQUFLLEFBQ25CLEFBQUM7QUFQZTtBQVNqQixBQUFFLEFBQUMsUUFBQyxBQUFHLEFBQUMsS0FBQyxBQUFDO0FBQ1IsQUFBVSxtQkFBQyxBQUFPLFFBQUMsQUFBSSxLQUNyQixDQUNFLEFBQVEsVUFDUixFQUFFLEFBQU8sU0FBRSxBQUFLLEFBQUUsQUFDbkIsQUFDRixBQUFDLEFBQ0o7QUFBQztBQUVELEFBQU0sV0FBQyxBQUFVLEFBQUMsQUFDcEI7QUFBQztBQUVELGVBQWUsQUFBc0IsQUFBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSb2xsdXAgZnJvbSAnYnJvY2NvbGktcm9sbHVwJztcbmltcG9ydCBub2RlUmVzb2x2ZSBmcm9tICdyb2xsdXAtcGx1Z2luLW5vZGUtcmVzb2x2ZSc7XG5pbXBvcnQgYmFiZWwgZnJvbSAncm9sbHVwLXBsdWdpbi1iYWJlbCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5jbGFzcyBSb2xsdXBXaXRoRGVwZW5kZW5jaWVzIGV4dGVuZHMgUm9sbHVwIHtcbiAgcm9sbHVwT3B0aW9uczogYW55O1xuICBpbnB1dFBhdGhzOiBhbnlbXTtcblxuICBjb25zdHJ1Y3RvcihpbnB1dE5vZGUsIG9wdGlvbnMpIHtcbiAgICBzdXBlciguLi5hcmd1bWVudHMpXG4gIH1cblxuICBidWlsZCguLi5hcmdzKSB7XG4gICAgbGV0IHBsdWdpbnMgPSB0aGlzLnJvbGx1cE9wdGlvbnMucGx1Z2lucyB8fCBbXTtcbiAgICBsZXQgaW5wdXRQYXRoID0gdGhpcy5pbnB1dFBhdGhzWzBdO1xuICAgIGxldCBwYWNrYWdlSlNPTiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAncGFja2FnZS5qc29uJykpLnRvU3RyaW5nKCd1dGY4JykpO1xuICAgIGxldCBlczUgPSAhKHBhY2thZ2VKU09OLmRldkRlcGVuZGVuY2llc1snQGdsaW1tZXIvd2ViLWNvbXBvbmVudCddKTtcblxuICAgIHBsdWdpbnMucHVzaChsb2FkV2l0aElubGluZU1hcCgpKTtcblxuICAgIHBsdWdpbnMucHVzaChiYWJlbChnZXRCYWJlbENvbmZpZyhlczUpKSk7XG5cbiAgICBwbHVnaW5zLnB1c2gobm9kZVJlc29sdmUoe1xuICAgICAganNuZXh0OiB0cnVlLFxuICAgICAgbWFpbjogdHJ1ZVxuICAgIH0pKTtcblxuICAgIHRoaXMucm9sbHVwT3B0aW9ucy5wbHVnaW5zID0gcGx1Z2lucztcblxuICAgIHRoaXMucm9sbHVwT3B0aW9ucy5vbndhcm4gPSBmdW5jdGlvbih3YXJuaW5nKSB7XG4gICAgICAvLyBTdXBwcmVzcyBrbm93biBlcnJvciBtZXNzYWdlIGNhdXNlZCBieSBUeXBlU2NyaXB0IGNvbXBpbGVkIGNvZGUgd2l0aCBSb2xsdXBcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9yb2xsdXAvcm9sbHVwL3dpa2kvVHJvdWJsZXNob290aW5nI3RoaXMtaXMtdW5kZWZpbmVkXG4gICAgICBpZiAod2FybmluZy5jb2RlID09PSAnVEhJU19JU19VTkRFRklORUQnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKFwiUm9sbHVwIHdhcm5pbmc6IFwiLCB3YXJuaW5nLm1lc3NhZ2UpO1xuICAgIH07XG5cbiAgICByZXR1cm4gUm9sbHVwLnByb3RvdHlwZS5idWlsZC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxufVxuXG5sZXQgU09VUkNFX01BUFBJTkdfREFUQV9VUkwgPSAnLy8jIHNvdXJjZU1hcCc7XG5TT1VSQ0VfTUFQUElOR19EQVRBX1VSTCArPSAncGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LCc7XG5cbmZ1bmN0aW9uIGxvYWRXaXRoSW5saW5lTWFwKCkge1xuICByZXR1cm4ge1xuICAgIGxvYWQ6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgaWYgKGlkLmluZGV4T2YoJ1xcMCcpID4gLTEpIHsgcmV0dXJuOyB9XG5cbiAgICAgIHZhciBjb2RlID0gZnMucmVhZEZpbGVTeW5jKGlkLCAndXRmOCcpO1xuICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgY29kZTogY29kZSxcbiAgICAgICAgbWFwOiBudWxsXG4gICAgICB9O1xuICAgICAgdmFyIGluZGV4ID0gY29kZS5sYXN0SW5kZXhPZihTT1VSQ0VfTUFQUElOR19EQVRBX1VSTCk7XG4gICAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgICByZXN1bHQuY29kZSA9IGNvZGU7XG4gICAgICByZXN1bHQubWFwID0gcGFyc2VTb3VyY2VNYXAoY29kZS5zbGljZShpbmRleCArIFNPVVJDRV9NQVBQSU5HX0RBVEFfVVJMLmxlbmd0aCkpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlU291cmNlTWFwKGJhc2U2NCkge1xuICByZXR1cm4gSlNPTi5wYXJzZShuZXcgQnVmZmVyKGJhc2U2NCwgJ2Jhc2U2NCcpLnRvU3RyaW5nKCd1dGY4JykpO1xufVxuXG5mdW5jdGlvbiBnZXRCYWJlbENvbmZpZyhlczUpIHtcbiAgbGV0IGJhc2VDb25maWcgPSB7XG4gICAgcHJlc2V0czogW10sXG4gICAgcGx1Z2luczogW1xuICAgICAgJ2V4dGVybmFsLWhlbHBlcnMnXG4gICAgXSxcbiAgICBzb3VyY2VNYXBzOiAnaW5saW5lJyxcbiAgICByZXRhaW5MaW5lczogZmFsc2VcbiAgfTtcblxuICBpZiAoZXM1KSB7XG4gICAgYmFzZUNvbmZpZy5wcmVzZXRzLnB1c2goXG4gICAgICBbXG4gICAgICAgICdlczIwMTUnLFxuICAgICAgICB7IG1vZHVsZXM6IGZhbHNlIH1cbiAgICAgIF1cbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGJhc2VDb25maWc7XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJvbGx1cFdpdGhEZXBlbmRlbmNpZXM7XG4iXX0=