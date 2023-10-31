import * as THREE from "three"
import type { Parameter } from "./preprocess";

export default function scene_setup(vert: string, frag: string, params: Parameter[]): [THREE.Scene, {[uniform: string]: THREE.IUniform<any>;}] {
    const scene = new THREE.Scene();

    const uniforms = {
        time: { value: 1.0 },
        light_direction: { value: new THREE.Vector3(1, 0, 0), },
        cam_direction: { value: new THREE.Matrix4() },
        screen_ratio: { value: window.innerHeight/window.innerWidth },
        
        ...Object.assign({}, ...params
            .map(p=>({[p.name]: { value: p.default }}))),
    };

    const material = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: vert,
        fragmentShader: frag,

        depthWrite: false,
        depthTest: false,
        transparent: true,

        uniforms
    });
    const quad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        material
    );
    scene.add(quad);

    return [scene, material.uniforms];
}