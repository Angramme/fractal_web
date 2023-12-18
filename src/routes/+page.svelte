<script lang="ts">
    import { onMount } from 'svelte';
    import * as THREE from 'three';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
    import vert_sh from "$lib/shader/fractal.vert?raw";
    import frag_sh from "$lib/shader/fractal.frag?raw";
    import { Parameter, preprocess } from '$lib/preprocess';
    import setup_scene from "$lib/scene"
    import { browser } from '$app/environment';

    const get_filename = (path: string)=>path.replace(/^.*[\\\/]/, '');
    const fractal_modules = 
        Object.fromEntries(
            Object.entries(
                import.meta.glob('$lib/fractals/*.glsl', { as: 'raw', eager: false }))
            .map(([key, val])=>[get_filename(key), val]));
    const fractals = Object.keys(fractal_modules);

    
    let show_gui = true;
    let canvas: HTMLCanvasElement;
    let pixel_ratio = 0.3;
    let renderer: THREE.WebGLRenderer;
    $: renderer && renderer.setPixelRatio(pixel_ratio*window.devicePixelRatio);
    
    const dynamic_params = true;
    let fractal = "jerusalem_cube.glsl";
    $: shaders = [vert_sh, frag_sh].map(f=>preprocess(f, dynamic_params, {"__fractal.glsl": fractal_modules[fractal]()}));
    let parameters: Promise<Parameter[]>;
    $: shaders && (()=>parameters = Promise.all(shaders).then(v=>v.flatMap(s=>s[1])))();
    // $: parameters = Promise.all(shaders).then(v=>v.flatMap(s=>s[1]));

    let material_handle: THREE.ShaderMaterial;
    $: uniform_handles = material_handle?.uniforms;
    $: define_handle = material_handle?.defines;

    let camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera( 75, 1., 0.1, 1000 );
    let controls: OrbitControls;
    let scene: THREE.Scene;

    const onresize = ()=>{
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        controls.update();
        if(uniform_handles?.screen_ratio)
            uniform_handles.screen_ratio.value = window.innerHeight/window.innerWidth;
    };
    const update_scene = async ()=>{
        const [vert, frag] = (await Promise.all(shaders)).map(v=>v[0]);

        [scene, material_handle] = setup_scene(vert, frag, await parameters);
        onresize();
        for(let pa of await parameters){
            pa.attachMaterial(material_handle);
        }
    };
    $: fractal && browser && update_scene();

    onMount(()=>{
        const cleanup: { (): any }[] = [];
        controls = new OrbitControls( camera, canvas );
        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
        })
        renderer.setPixelRatio(pixel_ratio*window.devicePixelRatio);
        
        onresize();
        window.addEventListener("resize", onresize);
        cleanup.push(()=>window.removeEventListener("resize", onresize));

        update_scene();

        camera.position.set(6, 5, 9);
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
    <button on:click={()=>show_gui=!show_gui}>{show_gui ? "hide" : "show"} GUI</button>
    <hr/>
    {#if show_gui}
        
        <h5>fractal :</h5>
        <select id="cars" bind:value={fractal}>
            {#each fractals as F}
                <option value={F}>{F.split(".")[0].replace("_", " ")}</option>                
            {/each}
        </select>
        <h5>resolution :</h5>
        <input type="range" step="0.01" min="0" max="1" bind:value={pixel_ratio}/>
        {#await parameters}
            Loading parameters...
        {:then params} 
            {#each params as p}
                <!-- <h5>{p.name} [{p.value}] :</h5> -->
                <h5>{p.name} [{p.value}] :</h5>
                <span>{p.min}</span>
                <input type="range" step={p.step} min={p.min} max={p.max} value={p.value} on:input={({target})=>p.value = (target?.value)}/>
                <span>{p.max}</span>
            {/each}
        {:catch error}
            <h1>There was an error loading the shader</h1>
            <p>
                {error}
            </p>
        {/await}
    {:else}
        gui hidden
    {/if}
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
    .gui > h5{
        margin: 0.8rem 0 0.1rem 0;
    }
</style>