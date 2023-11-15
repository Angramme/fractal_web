import { promises } from "fs"

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
	return {
        streamed: {
            fractals: promises.readdir(process.cwd() + "/static/shaders"),
        }
	};
}