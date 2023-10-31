<script lang="ts">
    import { onMount } from 'svelte';
    import * as THREE from 'three';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
    import vert_sh from "$lib/shader/fractal.vert?raw";
    import frag_sh from "$lib/shader/fractal.frag?raw";
    import { preprocess } from '$lib/preprocess';
    import setup_scene from "$lib/scene"

    let canvas: HTMLCanvasElement;
    let pixel_ratio = 0.1;
    let renderer: THREE.WebGLRenderer;
    // let parameters: Parameter[];
    $: renderer && renderer.setPixelRatio(pixel_ratio*window.devicePixelRatio);

    const dynamic_params = true;
    const shaders = [vert_sh, frag_sh].map(f=>preprocess(f, dynamic_params));
    const parameters = Promise.all(shaders).then(v=>v.flatMap(s=>s[1]));

    onMount(()=>{
        const cleanup: { (): any }[] = [];
        const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
        const controls = new OrbitControls( camera, canvas );
        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
        })
        renderer.setPixelRatio(pixel_ratio*window.devicePixelRatio);
        let scene: THREE.Scene;
        let uniform_handles: {[uniform: string]: THREE.IUniform<any>;} = {};

        const onresize = ()=>{
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            controls.update();
            if(uniform_handles.screen_ratio)
                uniform_handles.screen_ratio.value = window.innerHeight/window.innerWidth;
        };
        onresize();
        window.addEventListener("resize", onresize);
        cleanup.push(()=>window.removeEventListener("resize", onresize));

        (async ()=>{
            const [vert, frag] = (await Promise.all(shaders)).map(v=>v[0]);

            [scene, uniform_handles] = setup_scene(vert, frag, await parameters);
            onresize();
            for(let pa of await parameters){
                pa.attachUniform(uniform_handles[pa.name]);
            }
        })();

        camera.position.setZ(-20);
        // const rotation_mat = new THREE.Matrix4();

        let fps = 60;
        let now;
        let then = Date.now();
        let interval = 1000/fps;
        let delta;
        let start = Date.now();

        let LOOP = true;
        function animate(time: number) {
            if(LOOP) requestAnimationFrame( animate );
            now = Date.now();
            delta = now - then;
            if (delta > interval) {
                then = now - (delta % interval);

                controls.update();

                uniform_handles.cam_direction.value.extractRotation(camera.matrixWorld);
                uniform_handles.time.value = 0.001*(now-start);
                renderer.render( scene, camera );
            }
        }
        animate(0);

        cleanup.push(()=>LOOP=false);
        cleanup.push(()=>console.log("cleanup"));
        return async ()=>{
            for(let f of cleanup) await f();
        };
    });
</script>

<canvas bind:this={canvas}></canvas>

<div class="gui">
    <h5>resolution :</h5>
    <input type="range" step="0.01" min="0" max="1" bind:value={pixel_ratio}/>
    {#await parameters}
        Loading parameters...
    {:then params} 
        {#each params as p}
            <h5>{p.name} :</h5>
            <input type="range" step={p.type == "int" ? 1 : p.span/1000} min={p.min} max={p.max} bind:value={p.value}/>
        {/each}
    {/await}
</div>

<style>
    :global(body){
        overflow: hidden;
        padding: 0;
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
    }
    .gui{
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px;
        margin: 5px;
        border-radius: 5px;
        position: fixed;
        top: 0;
        right: 0;
    }
</style>