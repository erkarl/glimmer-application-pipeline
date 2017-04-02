import RollupWithDependencies from './rollup-with-dependencies';
import GlimmerTemplatePrecompiler from './glimmer-template-precompiler';
import { TypeScript } from "broccoli-typescript-compiler/lib/plugin";
export interface GlimmerAppOptions {
    outputPaths: any;
}
export interface Addon {
    contentFor: (type: string, config, content: string[]) => string;
}
export interface Project {
    root: string;
    name(): string;
    configPath(): string;
    addons: Addon[];
    pkg: {
        name: string;
    };
}
export interface Trees {
    srcTree: Tree;
    nodeModulesTree: Tree;
}
export interface Tree {
}
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
    options: GlimmerAppOptions;
    project: Project;
    name: string;
    env: 'production' | 'development' | 'test';
    protected trees: Trees;
    protected srcPath: string;
    constructor(defaults: any, options: any);
    _configReplacePatterns(): {
        match: RegExp;
        replacement: any;
    }[];
    buildTrees(): Trees;
    private resolveLocal(to);
    private tsOptions();
    /**
     * Creates a Broccoli tree representing the compiled Glimmer application.
     *
     * @param options
     */
    toTree(options: any): any;
    javascriptTree(): RollupWithDependencies;
    compiledTypeScriptTree(srcTree: any, nodeModulesTree: any): TypeScript;
    compiledHandlebarsTree(srcTree: any): GlimmerTemplatePrecompiler;
    rollupTree(jsTree: any): RollupWithDependencies;
    minifyTree(jsTree: any): any;
    rewriteConfigEnvironment(src: any): any;
    buildResolutionMap(src: any): any;
    buildResolverConfiguration(): any;
    cssTree(): any;
    publicTree(): any;
    htmlTree(): any;
    contentFor(config: any, match: RegExp, type: string): string;
    protected _contentForHead(content: string[], config: any): void;
    protected _configPath(): string;
    _cachedConfigTree: any;
    protected _configTree(): any;
}
