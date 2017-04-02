import Filter from 'broccoli-persistent-filter';
declare class GlimmerTemplatePrecompiler extends Filter {
    extensions: string[];
    targetExtension: string;
    options: any;
    constructor(inputNode: any, options: any);
    processString(content: any, relativePath: any): string;
}
export default GlimmerTemplatePrecompiler;
