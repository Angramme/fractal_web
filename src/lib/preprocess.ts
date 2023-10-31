import type { IUniform } from "three";

export class Parameter{
    type: string;
    name: string;
    default: number;
    min: number;
    max: number;
    dynamic: boolean;
    _material: undefined | THREE.ShaderMaterial;
    constructor(type: string, name: string, defaul: number, min: number, max: number, dynamic: boolean = false){
        this.type = type;
        this.name = name;
        this.min = min;
        this.max = max;
        this.default = defaul;
        this.dynamic = dynamic;
    }
    attachMaterial(mat: THREE.ShaderMaterial){
        this._material = mat;
    }
    get span(){
        return this.max - this.min;
    }
    set value(val: any){
        if(!this._material) return;
        if(!this.dynamic){
            this._material.needsUpdate = true;
            this._material.defines[this.name] = val;
        }else{
            this._material.uniforms[this.name].value = val;
        }
    }
    get value(){
        if(!this._material) return this.default;
        if(!this.dynamic){
            return this._material.defines[this.name];
        }else{
            return this._material.uniforms[this.name].value;
        }
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

export function parameters(shader: string, default_dynamic: boolean): [string, Parameter[]]{
    const expr = /^\s*parameter\s+(?:(static|dynamic)\s)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([0-9\-.,]+)\s*\[\s*([0-9\-.,]+)\s*,\s*([0-9\-.,]+)\s*\];/mg;
    const params: Parameter[] = [];
    const shad = shader.replace(expr,
        (_subs, interactivity, type, name, defaul, min, max)=>{
            const dynamic = interactivity == "dynamic";
            params.push(new Parameter(type, name, parseFloat(defaul), parseFloat(min), parseFloat(max), dynamic));
            if(dynamic) return `uniform ${type} ${name};\n`; 
            else return "";
        });
    return [shad, params];
}

export async function preprocess(shader_raw: string, default_dynamic: boolean) {
    // const query = (shd: string)=>import(`$lib/shader/${shd}?raw`)
    const query = (shd: string)=>fetch(`/shaders/${shd}`).then(v=>v.text())
    return parameters(await includes(shader_raw, query), true);
}