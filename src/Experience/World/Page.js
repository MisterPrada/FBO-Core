import * as THREE from 'three'
import Experience from '../Experience.js'

import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import gsap from "gsap";

import simVertex from '../Shaders/Particles/simulation.vert';
import simFragment from '../Shaders/Particles/simulation.frag';

import renderVertex from '../Shaders/Particles/render.vert';
import renderFragment from '../Shaders/Particles/render.frag';



import FBO from "../Utils/FBO.js";

export default class Page {
    constructor() {
        this.experience = new Experience()
        this.debug = this.experience.debug
        this.scene = this.experience.scene
        this.time = this.experience.time
        this.camera = this.experience.camera.instance
        this.renderer = this.experience.renderer.instance
        this.resources = this.experience.resources
        this.sizes = this.experience.sizes
        this.timeline = this.experience.timeline;
        this.isMobile = this.experience.isMobile
        this.cursor = this.experience.cursor

        this.setFBOParticles()
    }

    makeTexture(g){

        let vertAmount = g.attributes.position.count;
        let texWidth = Math.ceil(Math.sqrt(vertAmount));
        let texHeight = Math.ceil(vertAmount / texWidth);

        let data = new Float32Array(texWidth * texHeight * 4);

        function shuffleArrayByThree(array) {
            const groupLength = 3;

            let numGroups = Math.floor(array.length / groupLength);

            for (let i = numGroups - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));

                for (let k = 0; k < groupLength; k++) {
                    let temp = array[i * groupLength + k];
                    array[i * groupLength + k] = array[j * groupLength + k];
                    array[j * groupLength + k] = temp;
                }
            }

            return array;
        }


        shuffleArrayByThree(g.attributes.position.array);

        for(let i = 0; i < vertAmount; i++){
            //let f = Math.floor(Math.random() * (randomTemp.length / 3) );

            const x = g.attributes.position.array[i * 3 + 0];
            const y = g.attributes.position.array[i * 3 + 1];
            const z = g.attributes.position.array[i * 3 + 2];
            const w = 0

            //randomTemp.splice(f * 3, 3);

            data[i * 4 + 0] = x;
            data[i * 4 + 1] = y;
            data[i * 4 + 2] = z;
            data[i * 4 + 3] = w;
        }

        let dataTexture = new THREE.DataTexture(data, texWidth, texHeight, THREE.RGBAFormat, THREE.FloatType);
        dataTexture.needsUpdate = true;

        return dataTexture;
    }

    setFBOParticles() {
        // width and height of FBO
        const width = 512;
        const height = 512;

        function parseMesh(g){
            var vertices = g.vertices;
            var total = vertices.length;
            var size = parseInt( Math.sqrt( total * 4 ) + .5 );
            var data = new Float32Array( size*size * 4 );
            for( var i = 0; i < total; i++ ) {
                data[i * 3] = vertices[i].x;
                data[i * 3 + 1] = vertices[i].y;
                data[i * 3 + 2] = vertices[i].z;
            }
            return data;
        }

        //returns an array of random 3D coordinates
        function getRandomData( width, height, size ){
            var len = width * height * 4;
            var data = new Float32Array( len );
            //while( len-- )data[len] = ( Math.random() -.5 ) * size ;
            for(let i = 0; i < len; i++){
                data[i * 3 + 0] = (Math.random() - 0.5) * size
                data[i * 3 + 1] = (Math.random() - 0.5) * size
                data[i * 3 + 2] = (Math.random() - 0.5) * size
            }

            return data;
        }

        Math.cbrt = Math.cbrt || function (x) {
            var y = Math.pow(Math.abs(x), 1 / 3);
            return x < 0 ? -y : y;
        };

        function getPoint(v, size) {
            //the 'discard' method, not the most efficient
            v.x = Math.random() * 2 - 1;
            v.y = Math.random() * 2 - 1;
            v.z = Math.random() * 2 - 1;
            v.w = 0.0;
            if (v.length() > 1) return getPoint(v, size);
            return v.normalize().multiplyScalar(size);

            //exact but slow-ish
            /*
            var phi = Math.random() * 2 * Math.PI;
            var costheta = Math.random() * 2 -1;
            var u = Math.random();

            var theta = Math.acos( costheta );
            var r = size * Math.cbrt( u );

            v.x = r * Math.sin( theta) * Math.cos( phi );
            v.y = r * Math.sin( theta) * Math.sin( phi );
            v.z = r * Math.cos( theta );
            return v;
            //*/
        }

        //returns a Float32Array buffer of spherical 3D points
        function getSphere(count, size) {

            var len = count * 4;
            var data = new Float32Array(len);
            var p = new THREE.Vector3();
            for (var i = 0; i < len; i += 4) {
                getPoint(p, size);
                data[i] = p.x;
                data[i + 1] = p.y;
                data[i + 2] = p.z;
                data[i + 3] = 0.0;
            }
            return data;
        }

        let data = getSphere( width * height, 128 );
        let texture = new THREE.DataTexture( data, width, height, THREE.RGBAFormat, THREE.FloatType, THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping)
        texture.needsUpdate = true;

        this.simulationShader = new THREE.ShaderMaterial({
            uniforms: {
                uTexture: { type: "t", value: texture },
                timer: { type: "f", value: 0 },
                frequency: { type: "f", value: 0.01 },
                amplitude: { type: "f", value: 46 },
                maxDistance: { type: "f", value: 48 }
            },
            vertexShader: simVertex,
            fragmentShader:  simFragment

        });

        this.renderShader = new THREE.ShaderMaterial( {
            uniforms: {
                positions: { type: "t", value: null },
                uPointSize: { type: "f", value: 320 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
                big: { type: "v3", value: new THREE.Vector3(207,221,212).multiplyScalar(1/0xFF) },
                small: { type: "v3", value: new THREE.Vector3( 213,239,229).multiplyScalar(1/0xFF) }
            },
            vertexShader: renderVertex,
            fragmentShader: renderFragment,
            //transparent: true,
            side:THREE.DoubleSide,
            // depthWrite: false,
            // depthTest: false,
            blending:THREE.AdditiveBlending
        } );

        // // Initialize the FBO
        this.FBO = new FBO(width, height, this.renderer, this.simulationShader, this.renderShader);

        this.scene.add(  this.FBO.particles );


        // var data = getRandomData( width, height, 30 );
        // var positions = new THREE.DataTexture( data, width, height, THREE.RGBAFormat, THREE.FloatType );
        // positions.needsUpdate = true;
        // var uTextureA = positions;

        //simulation shader used to update the particles' positions
        // this.simMaterial = new THREE.ShaderMaterial({
        //     uniforms:{
        //         uTextureA: { type: "t", value: uTextureA },
        //         uTextureB: { type: "t", value: uTextureB },
        //         uTextureC: { type: "t", value: uTextureC },
        //         uTextureD: { type: "t", value: uTextureD },
        //         uTextureE: { type: "t", value: uTextureE },
        //         uTime: { value: 0 },
        //         uScroll : { value: this.normalizedScrollY },
        //         uTreePos : { value: new THREE.Vector3() },
        //     },
        //     defines:
        //     {
        //         uTotalModels : parseFloat(this.sectionCount).toFixed(2),
        //     },
        //     vertexShader: simVertex,
        //     fragmentShader:  simFragment
        // });
        //
        // //render shader to display the particles on screen
        // //the 'positions' uniform will be set after the FBO.update() call
        // this.renderMaterial = new THREE.ShaderMaterial( {
        //     uniforms: {
        //         uPositions: { value: null },
        //         uSize: { value: 12 },
        //         uTime: { value: 0 },
        //         uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        //         uScroll : { value: this.normalizedScrollY },
        //     },
        //     defines:
        //     {
        //         uTotalModels : parseFloat(this.sectionCount).toFixed(2),
        //         uRange : this.range,
        //     },
        //     vertexShader: particlesVertex,
        //     fragmentShader: particlesFragment,
        //     transparent: true,
        //     depthWrite: false,
        //     blending: THREE.AdditiveBlending
        // } );
        //
        // // Initialize the FBO
        // this.fbo = new FBO(width, height, this.renderer, this.simMaterial, this.renderMaterial);
        //
        // // Add the particles to the scene
        // this.scene.add(this.fbo.particles);

    }

    resize() {
        //this.fbo.resize(this.sizes.width, this.sizes.height);
        //this.renderMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
    }

    setAnimation() {

    }

    setDebug() {
        // Debug
        if(this.debug.active)
        {
            //this.debugFolder = this.debug.gui.addFolder('Cube')
            //this.debugFolder.open()
        }
    }

    update() {

        //update simulation
        this.FBO.update();

        //update mesh
        this.simulationShader.uniforms.timer.value += 0.01;
        this.FBO.particles.rotation.x = Math.cos( Date.now() *.001 ) * Math.PI / 180 * 2;
        this.FBO.particles.rotation.y -= Math.PI / 180 * .05;
    }
}
