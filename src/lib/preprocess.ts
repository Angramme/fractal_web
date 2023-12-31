
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
    get step(){
        return this.type == "int" ? 1 : this.span/1000;
    }
    set value(val: any){
        if(this.type == 'float' && parseInt(val) == parseFloat(val)) val = val + ".0";
        if(!this._material) return;
        if(!this.dynamic){
            this._material.needsUpdate = true;
            this._material.defines[this.name] = val;
        }else{
            this._material.uniforms[this.name].value = val;
        }
    }
    get value(){
        return this._normalize(this._value);
    }
    get _value(){
        if(!this._material) return this.default;
        if(!this.dynamic){
            return this._material.defines[this.name];
        }else{
            return this._material.uniforms[this.name].value;
        }
    }
    _normalize(val: any){
        val = Math.max(this.min, Math.min(this.max, val));
        if(this.type == 'int')
            return parseInt(val);
            // return (this.step * ((val-this.min)/this.step|0)) + this.min;
        else if(this.type == 'float')
            return parseFloat(val);
        else 
            return console.error("bad type inside parameter " + this.type);
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

export function unroll_loops(shader: string): string {
    const for_re = /#pragma\s+chunk_loop_start\s+([0-9]+)\s+for\s*\(\s*int\s(\S+?)\s*=\s*(\S+?)\s*;\s*(\S+?)\s*<\s*(\S+?)\s*;\s*(?:i\s*\+\+|\+\+\s*i)\s*\)\s*{([\S\s]+?)}\s*#pragma\s+chunk_loop_end/gm;

    shader = shader.replace(for_re, (_mch, chunk_size, i1, begin, i2, end, body: string)=>{
        if(i1 != i2) console.error("variable name mismatch in for loop unroll");
        let ret = `for(int ${i1}_A_A_A=${begin}; ${i1}_A_A_A < ${end}; ${i1}_A_A_A += ${chunk_size}){ int ${i1} = 0;`;
        ret += Array.from({length: chunk_size}).map((_, i)=>`
            ${i1} = ${i1}_A_A_A + ${i};
            if(${i1} >= ${end}) break;
            ${body}`
            ).join("\n");
        ret += '}';
        return ret;
    })

    return shader;
}

export async function preprocess(shader_raw: string, default_dynamic: boolean, special_files: {[k:string]:Promise<string>} = {}) {
    const query = (shd: string)=>special_files[shd] || new Promise(r=>r(""));
    // const prequery = (shd: string)=>special_files[shd] || null;
    // const query = (shd: string)=>prequery(shd) || (browser ? fetch(`/shaders/${shd}`).then(v=>v.text()) : new Promise(r=>r("")));
    return parameters(unroll_loops(await includes(shader_raw, query)), true);
}