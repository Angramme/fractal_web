import * as THREE from "three"
import type { Parameter } from "./preprocess";

export default function scene_setup(vert: string, frag: string, params: Parameter[]): 
    [THREE.Scene, THREE.ShaderMaterial] {
    const scene = new THREE.Scene();

    const value_str = (val: number, type: string)=>{
        if(type == "float") return val.toFixed(20);
        if(type == "int") return `${val | 0}`;
        else{
            console.warn("bad type "+type);
            return `${val}`;
        }
    }

    const uniforms = {
        time: { value: 1.0 },
        light_direction: { value: new THREE.Vector3(1.2, 1, 0.5).normalize(), },
        cam_direction: { value: new THREE.Matrix4() },
        screen_ratio: { value: window.innerHeight/window.innerWidth },
        
        ...Object.fromEntries(params
            .filter(d=>d.dynamic)
            .map(p=>[p.name, { value: p.value }])),
    };

    const defines = Object.assign({}, ...params
        .filter(d=>!d.dynamic)
        .map(p=>({[p.name]: value_str(p.value, p.type) })));

    const material = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: vert,
        fragmentShader: frag,

        depthWrite: false,
        depthTest: false,
        transparent: true,

        uniforms,

        defines,
    });
    const quad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        material
    );
    scene.add(quad);

    return [scene, material];
}