import Rollup from 'broccoli-rollup';
declare class RollupWithDependencies extends Rollup {
    rollupOptions: any;
    inputPaths: any[];
    constructor(inputNode: any, options: any);
    build(...args: any[]): any;
}
export default RollupWithDependencies;
