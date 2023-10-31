import type { IUniform } from "three";

export class Parameter{
    type: string;
    name: string;
    default: number;
    min: number;
    max: number;
    uniform: undefined | IUniform;
    constructor(type: string, name: string, defaul: number, min: number, max: number){
        this.type = type;
        this.name = name;
        this.min = min;
        this.max = max;
        this.default = defaul;
    }
    attachUniform(uni: IUniform){
        this.uniform = uni;
    }
    get span(){
        return this.max - this.min;
    }
    set value(val: any){
        if(!this.uniform) return;
        this.uniform.value = val;
    }
    get value(){
        if(!this.uniform) return this.min;
        return this.uniform.value;
    }
}

export function rename_export(raw: string, as: string){
    return raw
        // function export
        .replace(/^\s*#export\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/m, (_subs, type)=>
            `${type} ${as}(`);
}

export async function includes(shader_raw: string, query: (a: string) => Promise<string>){
    const expr = /^\s*#import +"(.*)" +as +(.*) *\n/gm;
    const proms: Promise<string>[] = [];
    shader_raw.replace(expr, (_subs, file, _name)=>{
        proms.push(query(file));
        return ""
    });
    const reso = await Promise.all(proms);
    return shader_raw.replace(expr, (_subs, _file, name)=>rename_export(reso.shift() || "error", name));
}

export function parameters(shader: string, dynamic: boolean): [string, Parameter[]]{
    const expr = /^\s*parameter\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([0-9\-.,]+)\s*\[\s*([0-9\-.,]+)\s*,\s*([0-9\-.,]+)\s*\];/mg;
    const params: Parameter[] = [];
    const shad = shader.replace(expr,
        (_subs, type, name, defaul, min, max)=>{
            params.push(new Parameter(type, name, parseFloat(defaul), parseFloat(min), parseFloat(max)));
            return `uniform ${type} ${name};`; 
        });
    return [shad, params];
}

export async function preprocess(shader_raw: string, dynamic: boolean) {
    // const query = (shd: string)=>import(`$lib/shader/${shd}?raw`)
    const query = (shd: string)=>fetch(`/shaders/${shd}`).then(v=>v.text())
    return parameters(await includes(shader_raw, query), true);
}