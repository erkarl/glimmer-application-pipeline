import Rollup from 'broccoli-rollup';
import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import * as fs from 'fs';
import * as path from 'path';
class RollupWithDependencies extends Rollup {
    constructor(inputNode, options) {
        super(...arguments);
    }
    build(...args) {
        let plugins = this.rollupOptions.plugins || [];
        let inputPath = this.inputPaths[0];
        let packageJSON = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')).toString('utf8'));
        let es5 = !(packageJSON.devDependencies['@glimmer/web-component']);
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
        return Rollup.prototype.build.apply(this, args);
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
        plugins: [
            'external-helpers'
        ],
        sourceMaps: 'inline',
        retainLines: false
    };
    if (es5) {
        baseConfig.presets.push([
            'es2015',
            { modules: false }
        ]);
    }
    return baseConfig;
}
export default RollupWithDependencies;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sbHVwLXdpdGgtZGVwZW5kZW5jaWVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Jyb2Njb2xpL3JvbGx1cC13aXRoLWRlcGVuZGVuY2llcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLE1BQU0sTUFBTSxpQkFBaUIsQ0FBQztBQUNyQyxPQUFPLFdBQVcsTUFBTSw0QkFBNEIsQ0FBQztBQUNyRCxPQUFPLEtBQUssTUFBTSxxQkFBcUIsQ0FBQztBQUN4QyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUU3Qiw0QkFBNkIsU0FBUSxNQUFNO0lBSXpDLFlBQVksU0FBUyxFQUFFLE9BQU87UUFDNUIsS0FBSyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUE7SUFDckIsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLElBQUk7UUFDWCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDL0MsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN6RyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFFbkUsT0FBTyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFFbEMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV6QyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUN2QixNQUFNLEVBQUUsSUFBSTtZQUNaLElBQUksRUFBRSxJQUFJO1NBQ1gsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFFckMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsVUFBUyxPQUFPO1lBQzFDLDhFQUE4RTtZQUM5RSwwRUFBMEU7WUFDMUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pDLE1BQU0sQ0FBQztZQUNULENBQUM7WUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUM7UUFFRixNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNsRCxDQUFDO0NBQ0Y7QUFFRCxJQUFJLHVCQUF1QixHQUFHLGVBQWUsQ0FBQztBQUM5Qyx1QkFBdUIsSUFBSSx1Q0FBdUMsQ0FBQztBQUVuRTtJQUNFLE1BQU0sQ0FBQztRQUNMLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDaEIsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQUMsTUFBTSxDQUFDO1lBQUMsQ0FBQztZQUV0QyxJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxJQUFJLE1BQU0sR0FBRztnQkFDWCxJQUFJLEVBQUUsSUFBSTtnQkFDVixHQUFHLEVBQUUsSUFBSTthQUNWLENBQUM7WUFDRixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDdEQsRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakIsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNoQixDQUFDO1lBQ0QsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7WUFDbkIsTUFBTSxDQUFDLEdBQUcsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNoRixNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ2hCLENBQUM7S0FDRixDQUFDO0FBQ0osQ0FBQztBQUVELHdCQUF3QixNQUFNO0lBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNuRSxDQUFDO0FBRUQsd0JBQXdCLEdBQUc7SUFDekIsSUFBSSxVQUFVLEdBQUc7UUFDZixPQUFPLEVBQUUsRUFBRTtRQUNYLE9BQU8sRUFBRTtZQUNQLGtCQUFrQjtTQUNuQjtRQUNELFVBQVUsRUFBRSxRQUFRO1FBQ3BCLFdBQVcsRUFBRSxLQUFLO0tBQ25CLENBQUM7SUFFRixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ1IsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQ3JCO1lBQ0UsUUFBUTtZQUNSLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtTQUNuQixDQUNGLENBQUM7SUFDSixDQUFDO0lBRUQsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBRUQsZUFBZSxzQkFBc0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSb2xsdXAgZnJvbSAnYnJvY2NvbGktcm9sbHVwJztcbmltcG9ydCBub2RlUmVzb2x2ZSBmcm9tICdyb2xsdXAtcGx1Z2luLW5vZGUtcmVzb2x2ZSc7XG5pbXBvcnQgYmFiZWwgZnJvbSAncm9sbHVwLXBsdWdpbi1iYWJlbCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5jbGFzcyBSb2xsdXBXaXRoRGVwZW5kZW5jaWVzIGV4dGVuZHMgUm9sbHVwIHtcbiAgcm9sbHVwT3B0aW9uczogYW55O1xuICBpbnB1dFBhdGhzOiBhbnlbXTtcblxuICBjb25zdHJ1Y3RvcihpbnB1dE5vZGUsIG9wdGlvbnMpIHtcbiAgICBzdXBlciguLi5hcmd1bWVudHMpXG4gIH1cblxuICBidWlsZCguLi5hcmdzKSB7XG4gICAgbGV0IHBsdWdpbnMgPSB0aGlzLnJvbGx1cE9wdGlvbnMucGx1Z2lucyB8fCBbXTtcbiAgICBsZXQgaW5wdXRQYXRoID0gdGhpcy5pbnB1dFBhdGhzWzBdO1xuICAgIGxldCBwYWNrYWdlSlNPTiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAncGFja2FnZS5qc29uJykpLnRvU3RyaW5nKCd1dGY4JykpO1xuICAgIGxldCBlczUgPSAhKHBhY2thZ2VKU09OLmRldkRlcGVuZGVuY2llc1snQGdsaW1tZXIvd2ViLWNvbXBvbmVudCddKTtcblxuICAgIHBsdWdpbnMucHVzaChsb2FkV2l0aElubGluZU1hcCgpKTtcblxuICAgIHBsdWdpbnMucHVzaChiYWJlbChnZXRCYWJlbENvbmZpZyhlczUpKSk7XG5cbiAgICBwbHVnaW5zLnB1c2gobm9kZVJlc29sdmUoe1xuICAgICAganNuZXh0OiB0cnVlLFxuICAgICAgbWFpbjogdHJ1ZVxuICAgIH0pKTtcblxuICAgIHRoaXMucm9sbHVwT3B0aW9ucy5wbHVnaW5zID0gcGx1Z2lucztcblxuICAgIHRoaXMucm9sbHVwT3B0aW9ucy5vbndhcm4gPSBmdW5jdGlvbih3YXJuaW5nKSB7XG4gICAgICAvLyBTdXBwcmVzcyBrbm93biBlcnJvciBtZXNzYWdlIGNhdXNlZCBieSBUeXBlU2NyaXB0IGNvbXBpbGVkIGNvZGUgd2l0aCBSb2xsdXBcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9yb2xsdXAvcm9sbHVwL3dpa2kvVHJvdWJsZXNob290aW5nI3RoaXMtaXMtdW5kZWZpbmVkXG4gICAgICBpZiAod2FybmluZy5jb2RlID09PSAnVEhJU19JU19VTkRFRklORUQnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKFwiUm9sbHVwIHdhcm5pbmc6IFwiLCB3YXJuaW5nLm1lc3NhZ2UpO1xuICAgIH07XG5cbiAgICByZXR1cm4gUm9sbHVwLnByb3RvdHlwZS5idWlsZC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxufVxuXG5sZXQgU09VUkNFX01BUFBJTkdfREFUQV9VUkwgPSAnLy8jIHNvdXJjZU1hcCc7XG5TT1VSQ0VfTUFQUElOR19EQVRBX1VSTCArPSAncGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LCc7XG5cbmZ1bmN0aW9uIGxvYWRXaXRoSW5saW5lTWFwKCkge1xuICByZXR1cm4ge1xuICAgIGxvYWQ6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgaWYgKGlkLmluZGV4T2YoJ1xcMCcpID4gLTEpIHsgcmV0dXJuOyB9XG5cbiAgICAgIHZhciBjb2RlID0gZnMucmVhZEZpbGVTeW5jKGlkLCAndXRmOCcpO1xuICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgY29kZTogY29kZSxcbiAgICAgICAgbWFwOiBudWxsXG4gICAgICB9O1xuICAgICAgdmFyIGluZGV4ID0gY29kZS5sYXN0SW5kZXhPZihTT1VSQ0VfTUFQUElOR19EQVRBX1VSTCk7XG4gICAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgICByZXN1bHQuY29kZSA9IGNvZGU7XG4gICAgICByZXN1bHQubWFwID0gcGFyc2VTb3VyY2VNYXAoY29kZS5zbGljZShpbmRleCArIFNPVVJDRV9NQVBQSU5HX0RBVEFfVVJMLmxlbmd0aCkpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlU291cmNlTWFwKGJhc2U2NCkge1xuICByZXR1cm4gSlNPTi5wYXJzZShuZXcgQnVmZmVyKGJhc2U2NCwgJ2Jhc2U2NCcpLnRvU3RyaW5nKCd1dGY4JykpO1xufVxuXG5mdW5jdGlvbiBnZXRCYWJlbENvbmZpZyhlczUpIHtcbiAgbGV0IGJhc2VDb25maWcgPSB7XG4gICAgcHJlc2V0czogW10sXG4gICAgcGx1Z2luczogW1xuICAgICAgJ2V4dGVybmFsLWhlbHBlcnMnXG4gICAgXSxcbiAgICBzb3VyY2VNYXBzOiAnaW5saW5lJyxcbiAgICByZXRhaW5MaW5lczogZmFsc2VcbiAgfTtcblxuICBpZiAoZXM1KSB7XG4gICAgYmFzZUNvbmZpZy5wcmVzZXRzLnB1c2goXG4gICAgICBbXG4gICAgICAgICdlczIwMTUnLFxuICAgICAgICB7IG1vZHVsZXM6IGZhbHNlIH1cbiAgICAgIF1cbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGJhc2VDb25maWc7XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJvbGx1cFdpdGhEZXBlbmRlbmNpZXM7XG4iXX0=