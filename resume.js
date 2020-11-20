import * as THREE from './3D.js';

import Stats from './libs/stats.module.js';

import { OrbitControls } from './libs/OrbitControls.js';
import { MD2CharacterComplex } from './libs/MD2CharacterComplex.js';
import { Gyroscope } from './libs/Gyroscope.js';
import { Mint } from './mint.min.js';
import { SVGLoader } from './libs/SVGLoader.js';
var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;

var container, stats;
var camera, scene, renderer;

var characters = [];
var nCharacters = 0;

var cameraControls;

var controls = {

    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false

};
var projectiveObj;//定义上次投射到的对象
var raycaster, mouse;//光投射器，鼠标位置对应的二维向量

var browerType;

// 自定义插件
var mint = new Mint("Plug init ...");
mint.init(THREE);
var clock = new THREE.Clock();

browerTypeChange();
init();
animate();

function createTip(title) {
    const tip = document.createElement('div');
    tip.style.zIndex = "999";
    tip.style.background = "#ccc";
    tip.style.width = "300px";
    tip.style.height = "100px";
    tip.style.color = "red";
    tip.style.fontSize = "25px";
    tip.style.fontWeight = "600";
    tip.style.position = "absolute";
    tip.style.textAlign = "left";
    tip.style.top = "30%";
    tip.style.left = "50%";
    tip.style.transform = "translate(-50%,-50%)";
    tip.innerText = title;
    document.body.append(tip);
    tip.onclick = function () {
        tip.remove();
    };
}

function browerTypeChange() {
    window.addEventListener("load", function () {
        browerTypeChange();
    })
    var ua = window.navigator.userAgent.toLowerCase();    // 该属性包含了浏览器类型、版本、操作系统类型、浏览器引擎类型等信息
    //通过正则表达式匹配ua中是否含有MicroMessenger字符串
    if (ua.match(/MicroMessenger/i) == 'micromessenger') {
        createTip("暂不支持微信端");
        browerType = "weixin";
    } else if ((navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i))) {
        createTip("当前模式为移动端，将在之后支持,点击可关闭提示！");
        browerType = "mobile";
    } else {
        browerType = "pc";
    }
}

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    // CAMERA

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 4000);
    camera.position.set(0, 150, 1300);

    // SCENE

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // 阴影部分
    scene.fog = new THREE.Fog(0xffffff, 1000, 3000);

    scene.add(camera);

    // LIGHTS

    scene.add(new THREE.AmbientLight(0x222222));

    var light = new THREE.DirectionalLight(0xffffff, 2.25);
    light.position.set(200, 450, 500);

    light.castShadow = true;

    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 512;

    light.shadow.camera.near = 100;
    light.shadow.camera.far = 1200;

    light.shadow.camera.left = - 1000;
    light.shadow.camera.right = 1000;
    light.shadow.camera.top = 350;
    light.shadow.camera.bottom = - 350;

    scene.add(light);
    // scene.add( new CameraHelper( light.shadow.camera ) );

    // 自定义文字
    mint.createText(scene, "hellow!闫全堃(Mint) 个人介绍", {
        size: 20, height: 2, weight: 'normal', curveSegments: 10,
        style: "normal",
        bevelThickness: 1, bevelSize: 2, bevelEnabled: true,
        material: 0, extrudeMaterial: 1
    }, [50, 200, 400]);
    mint.createText(scene, "git:https://github.com/yanquankun", {
        size: 20, height: 2, weight: 'normal', curveSegments: 10,
        style: "normal",
        bevelThickness: 1, bevelSize: 2, bevelEnabled: true,
        material: 0, extrudeMaterial: 1, PI: - Math.PI / 4
    }, [-300, 10, 400]);
    //  GROUND

    var gt = new THREE.TextureLoader().load("textures/terrain/grasslight-big.jpg");
    var gg = new THREE.PlaneBufferGeometry(16000, 16000);
    var gm = new THREE.MeshPhongMaterial({ color: 0xffffff, map: gt });

    var ground = new THREE.Mesh(gg, gm);
    ground.rotation.x = - Math.PI / 2;
    ground.material.map.repeat.set(64, 64);
    ground.material.map.wrapS = THREE.RepeatWrapping;
    ground.material.map.wrapT = THREE.RepeatWrapping;
    ground.material.map.encoding = THREE.sRGBEncoding;
    // note that because the ground does not cast a shadow, .castShadow is left false
    ground.receiveShadow = true;

    scene.add(ground);

    // PAINTING 图片以及图片墙
    var canvas = mint.mipmap(128, '0xffffff');
    var textureCanvas1 = new THREE.CanvasTexture(canvas);
    var materialCanvas1 = new THREE.MeshBasicMaterial({ map: textureCanvas1 });
    var geometry = new THREE.PlaneBufferGeometry(100, 100);
    var meshCanvas1 = new THREE.Mesh(geometry, materialCanvas1);
    meshCanvas1.rotation.x = - Math.PI / 2;
    meshCanvas1.scale.set(1000, 1000, 1000);
    mint.addPainting("./images/haimianbaobao.jpg", meshCanvas1, scene, geometry, [-700, null, null]);
    // mint.addPainting("./images/haimianbaobao.jpg", meshCanvas1, scene, geometry, [null, null, -500]);

    // 创建辅助坐标轴
    var axes = new THREE.AxisHelper(200);//参数设置了三条轴线的长度
    axes.position.x = -500;
    axes.position.y = 0;
    axes.position.z = 100;
    scene.add(axes)

    // 添加光投射器Raycaster
    // 通过光投射器结合鼠标位置坐标，判断鼠标是否经过物体
    raycaster = new THREE.Raycaster();//光线投射器
    mouse = new THREE.Vector2();//二维向量 
    document.addEventListener('mousemove', function ($event) {
        $event.preventDefault();
        mouse.x = ($event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -($event.clientY / window.innerHeight) * 2 + 1;
    }, false);

    //添加鼠标点击事件，捕获点击时当前选中的物体
    window.addEventListener('click', function () {
        if (projectiveObj) {
            console.log(projectiveObj.geometry.parameters.text);
            const text = projectiveObj.geometry.parameters.text;
            if (text) {
                if (text.indexOf("git") != -1) window.open(text.split("git:")[1]);
                else alert("您正在读的文本是：" + text);
            }
            if (projectiveObj.geometry.parameters.text)
                if (projectiveObj.hasChecked) {
                    !Array.isArray(projectiveObj.material) &&
                        (projectiveObj.hasChecked = false)
                    projectiveObj.material.color.set("gray");
                } else {
                    !Array.isArray(projectiveObj.material) &&
                        (projectiveObj.hasChecked = true)
                        && projectiveObj.material.color.set("#dd830d");
                }
        }

    }, false);

    // RENDERER

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    container.appendChild(renderer.domElement);

    //

    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // STATS

    stats = new Stats();
    container.appendChild(stats.dom);

    // EVENTS

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    // CONTROLS

    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 50, 0);
    cameraControls.enableKeys = false;
    cameraControls.update();

    // CHARACTER

    var configOgro = {

        baseUrl: "models/md2/ogro/",

        body: "ogro.md2",
        skins: ["grok.jpg"],
        weapons: [["weapon.md2", "weapon.jpg"]],
        animations: {
            move: "run",
            idle: "stand",
            jump: "jump",
            attack: "attack",
            crouchMove: "cwalk",
            crouchIdle: "cstand",
            crouchAttach: "crattack"
        },

        walkSpeed: 350,
        crouchSpeed: 175

    };

    var nRows = 1;
    var nSkins = configOgro.skins.length;

    nCharacters = nSkins * nRows;

    for (var i = 0; i < nCharacters; i++) {

        var character = new MD2CharacterComplex();
        character.scale = 3;
        character.controls = controls;
        characters.push(character);

    }

    var baseCharacter = new MD2CharacterComplex();
    baseCharacter.scale = 3;

    baseCharacter.onLoadComplete = function () {

        var k = 0;

        for (var j = 0; j < nRows; j++) {

            for (var i = 0; i < nSkins; i++) {

                var cloneCharacter = characters[k];

                cloneCharacter.shareParts(baseCharacter);

                // cast and receive shadows
                cloneCharacter.enableShadows(true);

                cloneCharacter.setWeapon(0);
                cloneCharacter.setSkin(i);

                cloneCharacter.root.position.x = (i - nSkins / 2) * 150;
                cloneCharacter.root.position.z = j * 250;

                scene.add(cloneCharacter.root);

                k++;

            }

        }

        var gyro = new Gyroscope();
        gyro.add(camera);
        gyro.add(light, light.target);

        characters[Math.floor(nSkins / 2)].root.add(gyro);

    };

    baseCharacter.loadParts(configOgro);

}

// EVENT HANDLERS

function onWindowResize() {

    SCREEN_WIDTH = window.innerWidth;
    SCREEN_HEIGHT = window.innerHeight;

    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

    camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
    camera.updateProjectionMatrix();

}

function onKeyDown(event) {

    switch (event.keyCode) {

        case 38: /*up*/
        case 87: /*W*/ 	controls.moveForward = true; break;

        case 40: /*down*/
        case 83: /*S*/ 	 controls.moveBackward = true; break;

        case 37: /*left*/
        case 65: /*A*/ controls.moveLeft = true; break;

        case 39: /*right*/
        case 68: /*D*/ controls.moveRight = true; break;

        //case 67: /*C*/     controls.crouch = true; break;
        case 32: /*space*/ controls.jump = true; break;
        case 17: /*ctrl*/  controls.attack = true; break;

    }

}

function onKeyUp(event) {

    switch (event.keyCode) {

        case 38: /*up*/
        case 87: /*W*/ controls.moveForward = false; break;

        case 40: /*down*/
        case 83: /*S*/ 	 controls.moveBackward = false; break;

        case 37: /*left*/
        case 65: /*A*/ 	 controls.moveLeft = false; break;

        case 39: /*right*/
        case 68: /*D*/ controls.moveRight = false; break;

        //case 67: /*C*/     controls.crouch = false; break;
        case 32: /*space*/ controls.jump = false; break;
        case 17: /*ctrl*/  controls.attack = false; break;

    }

}

/**
   * 根据光投射器判断鼠标所在向量方向是否穿过物体
   * @param {*} raycaster 光投射器
   * @param {*} scene     场景
   * @param {*} camera    相机
   * @param {*} mouse     鼠标位置对应的二维向量
   */
function renderRaycasterObj(raycaster, scene, camera, mouse) {
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
        var currentProjectiveObjT = intersects[0].object;
        if (projectiveObj != currentProjectiveObjT) {
            if ((currentProjectiveObjT instanceof THREE.AxisHelper) || (currentProjectiveObjT instanceof THREE.GridHelper)) {
                //穿过的是坐标轴线和网格线
                return;
            }
            projectiveObj = intersects[0].object;
        }
    } else {
        projectiveObj = null;
    }
}

function animate() {

    requestAnimationFrame(animate);
    render();

    stats.update();

}

function render() {

    var delta = clock.getDelta();

    for (var i = 0; i < nCharacters; i++) {

        characters[i].update(delta);

    }
    renderRaycasterObj(raycaster, scene, camera, mouse);//渲染光投射器投射到的对象
    renderer.render(scene, camera);

}
