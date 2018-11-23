/**
 * @author miyao
 */


var MeshRender = function () {
    if (!(this instanceof MeshRender)) {
        return new MeshRender();
    }

    // 加载物体模型包围盒长/宽/高
    this.partBox;
    this.partMaxX = 0;
    this.partMaxY = 0;
    this.partMaxZ = 0;
    this.partMinX = 0;
    this.partMinY = 0;
    this.partMinZ = 0;
    this.partWidth = 0; //!<三维模型长度/高度/深度
    this.partHeight = 0;
    this.partDepth = 0;

    this.activeLayer = 0;      //!<作用层int(0当前层/1全部层/2指定层)
    this.specifyLayer = '';   //!<指定层string

    // 条形
    this.gridBarsName = 'GridBarPlaneGroup';
    this.angularRotation = 0;  //!<角度循环string
    this.divideWidth = 0;  //!<宽度int
    this.spacerRegion = 0;  //!<区域间隔int

    // 棋盘格
    this.checkerboardName = 'CheckerboardGroup';
    this.divideType = 0;  //!<类型int, 0：无 1：横向 2：纵向
    this.divideLong = 0;  //!<长度int
    this.longInterval = 0;  //!<长度间隔int
    this.divideWidth = 0;  //!<宽度int
    this.wideInterval = 0;  //!<宽度间隔int
    this.tempIntegralForm = '';  //!<角度循环string

    // flake
    this.positions = [];
    this.next_positions_index = 0;
    this.colors = [];
    this.indices_array = [];

};

MeshRender.prototype = {

    /**
     *@brief 清空场景上指定的物体
     */
    clearSpecObjectOnSence: function ( object, objectName, whetherRender ) {
        var removeGroup = object.getObjectByName( objectName );

        if ( removeGroup !== undefined && removeGroup instanceof THREE.Object3D ) {
            removeGroup.traverse(function (children) {
                if (children instanceof THREE.Mesh) {
                    children.geometry.dispose();
                    children.material.dispose();
                }
            });
            object.remove(removeGroup);
        }

        if (whetherRender === true) {
            renderer.render(scene, camera);
        }
    },


    /**
     *@brief 把导入的STL文件加载进mesh的固定位置
     */
    loadSTL2Group: function (geometry, material) {
        var objMesh = new THREE.Mesh(geometry, material);
        pivotOfSTL = new THREE.Group();
        pivotOfSTL.name = 'importStlModel';
        pivotOfSTL.add(objMesh);
        var box = new THREE.Box3().setFromObject(objMesh);
        box.center(objMesh.position); //计算出三维模型的中心点
        objMesh.position.multiplyScalar(-1);
        box.center(pivotOfSTL.position);
    },


    /**
     *@brief 导出STL文件
     */
    exportBinaryStlFile: function (stlFilePath, objScene, nFaceNum) {
        var exporter = new THREE.STLBinaryExporter();
        console.log("faceNUm = ", nFaceNum);
        var exportData = exporter.parse(objScene, nFaceNum);
        // then you can caoll saveFile(stlFilePath, exportData);
    },


    /**
     *@brief 平移模型
     */
    translateModel: function (model, type, xPositon, yPositon, zPositon) {
        if (type === 0) {  // 绝对
            model.position.x = xPositon;
            model.position.y = yPositon;
            model.position.z = zPositon + gGetPartHeight / 2;
            model.updateMatrixWorld(true);
        } else if (type === 1) {  // 相对
            model.position.x += xPositon;
            model.position.y += yPositon;
            model.position.z += zPositon;
            model.updateMatrixWorld(true);
        }
    },


    /**
     *@brief 旋转模型
     */
    rotationModel: function (model, xRotation, yRotation, zRotation) {
        function rotateAroundWorldAxis(object, axis, radians) {
            // 绕任意轴旋转模型
            var rotWorldMatrix = new THREE.Matrix4();
            rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);
            rotWorldMatrix.multiply(object.matrix);
            object.matrix = rotWorldMatrix;
            object.rotation.setFromRotationMatrix(object.matrix, 'XYZ');
        }

        var xRadian = xRotation * (Math.PI / 180);
        var yRadian = yRotation * (Math.PI / 180);
        var zRadian = zRotation * (Math.PI / 180);
        rotateAroundWorldAxis(model, new THREE.Vector3(1, 0, 0), xRadian.toFixed(2));
        rotateAroundWorldAxis(pivotOfSTL, new THREE.Vector3(0, 1, 0), yRadian.toFixed(2));
        rotateAroundWorldAxis(pivotOfSTL, new THREE.Vector3(0, 0, 1), zRadian.toFixed(2));
    },


    /**
     *@brief 缩放模型
     */
    scaleModel: function (model, xScale, yScale, zScale) {
        gScaleX *= xScale / 100;
        gScaleY *= yScale / 100;
        gScaleZ *= zScale / 100;
        model.scale.set(gScaleX, gScaleY, gScaleZ);
        model.updateMatrixWorld(true);
        model.normalsNeedUpdate = true;
    },


    normalVector: function( startVector, endVector, distance ) {
        var v = new THREE.Vector3();
        v.subVectors( endVector, startVector );  // 两个点的向量v=endVector-startVector
        v.normalize();  // unit vector: normal / length

        if ( distance > 0) {  // 法向量向上
            var vX = -v.z;
            var vZ = v.x;
        } else {  // 法向量向下
            var vX = v.z;
            var vZ = -v.x;
        }

        v.x = vX;
        v.z = vZ;

        return v;
    },

    getTranslationVector: function( orignV, normalV, distance ) {
        var v = new THREE.Vector3();
        v.copy( normalV );
        v.multiplyScalar( distance );
        v.add( orignV )  // unit vector * distance + orignV
        return v;
    },


    /**
     *@brief 用clipper求多边形的差集
     */
    clipDifference: function ( subj, clip ) {
        var solution = new ClipperLib.Paths();
        var clipper = new ClipperLib.Clipper();
        clipper.AddPaths(subj, ClipperLib.PolyType.ptSubject, true);
        clipper.AddPaths(clip, ClipperLib.PolyType.ptClip, true);
        clipper.Execute(ClipperLib.ClipType.ctDifference, solution);
        return solution;
    },


    add_vertex: function  (v) {
        var self = this;

        //if (self.next_positions_index == 0xffff) throw new Error("Too many points");

        self.positions.push(v.x, v.y, v.z);
        return self.next_positions_index++;
    },

    /**
     *@brief simple Koch curve
     */
    lineflake_iteration: function (p0, p4) {
        var self = this;

        var i = self.next_positions_index-1; // p0 already there
        self.add_vertex(p4);
        self.indices_array.push(i, i+1);

    },

    /**
     *@brief generate line data
     *@via https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_lines_indexed.html
     */
    lineFlake: function ( points, loop ) {
        var self = this;

        self.add_vertex( points[0]);
        for (var p_index=0, p_count=points.length-1; p_index != p_count; ++p_index) {
            self.lineflake_iteration(points[p_index], points[p_index+1], 0);
        }

        if (loop) self.lineflake_iteration(points[points.length-1], points[0], 0);

    },

    /**
     *@brief clear temp flake data: for next drawSliceDividedLine request
     */
    clearTempFlake: function () {
        this.positions = [];
        this.next_positions_index = 0;
        this.colors = [];
        this.indices_array = [];
    },


    drawLine: function ( geometry, material, pointsArray ) {
        var ps = pointsArray[0];

        for ( var i = 0; i < ps.length; i += 2 ) {
            this.positions.push( ps[i] / gCoordPrecision, ps[i + 1] / gCoordPrecision, 0 );
        }

        geometry.addAttribute( 'position', new THREE.Float32Attribute( this.positions, 3 ) );

        return new THREE.Line( geometry, material );
    },


    drawLineSegments: function ( geometry, material, pointsArray ) {
        var self = this;

        function packPoints(ps) {
            var pack_points = [];
            for ( var i = 0; i < ps.length; i += 2 ) {
                pack_points.push( new THREE.Vector3( ps[i]/gCoordPrecision, ps[i + 1]/gCoordPrecision, 0 ) );
            }
            return pack_points;
        }

        for (var j=0; j < pointsArray.length; j++) {
            self.lineFlake( packPoints(pointsArray[j]), false);
        }

        geometry.setIndex( new THREE.BufferAttribute( new Uint16Array( self.indices_array ), 1 ) );
        geometry.addAttribute( 'position', new THREE.Float32Attribute( self.positions, 3 ) );

        return new THREE.LineSegments( geometry, material );
    },


    makeLine: function ( geometry, color, lineWidth ) {
        var g = new MeshLine();
        g.setGeometry( geometry );
        geometry.dispose();
        var material = new MeshLineMaterial( {
            useMap: false,
            color: new THREE.Color( color ),
            opacity: 1,
            resolution: new THREE.Vector2( canvas.width, canvas.height ),
            sizeAttenuation: false, // (1 unit is 1px on screen) (0 - attenuate, 1 - don't attenuate)
            lineWidth: lineWidth / 1000,
            near: camera.near,
            far: camera.far
        });
        return new THREE.Mesh( g.geometry, material );
    },

    /**
     *@brief 使用MeshLine实现线宽
     */
    createLines: function ( geometry, color, lineWidth ) {
        var self = this;

        if( lineMesh ){
            scene.remove( lineMesh );
        }

        return self.makeLine( geometry, color, lineWidth );
    },


    /**
     *@brief 根据给定的点生成线宽矩形所需的点
     */
    generateLineWidthPoints: function ( lineWidth ) {
        /*
        v1----v2
        |     |
        v4----v3
        */
        var self = this;
        var distance = parseFloat( ( lineWidth / 2 ).toFixed(2) );
        var startVector = mousePositionValue[0];
        var endVector = mousePositionValue[mousePositionValue.length - 1];
        var nomalVector = self.normalVector( startVector, endVector, distance );
        var nomalVectorNegate = self.normalVector( startVector, endVector, -distance );
        var v1 = self.getTranslationVector( startVector, nomalVector,  distance );
        var v2 = self.getTranslationVector( endVector, nomalVector, distance );
        var v3 = self.getTranslationVector( endVector, nomalVectorNegate, distance );
        var v4 = self.getTranslationVector( startVector, nomalVectorNegate, distance );

        return [
            v1.x.toFixed(2), v1.z.toFixed(2),
            v2.x.toFixed(2), v2.z.toFixed(2),
            v3.x.toFixed(2), v3.z.toFixed(2),
            v4.x.toFixed(2), v4.z.toFixed(2),
            v1.x.toFixed(2), v1.z.toFixed(2)
        ];
    },

    /**
     *@brief 根据指定线宽绘制直线
     */
    drawStraightLine: function ( lineWidth ) {
        var self = this;

        var straightLine = scene.getObjectByName("StraightLine");
        if( straightLine === undefined ) {
            var straightLine = new THREE.Object3D();
            straightLine.name = "StraightLine";
        }

        var geometry = new THREE.Geometry();
        var points = self.generateLineWidthPoints( lineWidth );
        for ( var i = 0; i < points.length; i += 2 ) {
            var p = new THREE.Vector3( points[i], points[i+1], 0 );
            geometry.vertices.push(p);
        }
       
        var material = new THREE.LineBasicMaterial({ color: 0x0000FF });
        var tempLine = new THREE.Line(geometry, material);
        tempLine.name = "tempLine";
        straightLine.add( tempLine );

        scene.add( straightLine );  //!记得清空straightLine
    },


    /**
     *@brief 根据指定线宽绘制折线
     */
    addTrendLine: function ( lineWidth, isOnPressed ) {
        var self = this;

        var geometry = new THREE.Geometry();
        var points = self.generateLineWidthPoints( lineWidth );
        for ( var i = 0; i < points.length; i += 2 ) {
            var p = new THREE.Vector3( points[i], points[i+1], 0 );
            geometry.vertices.push(p);
        }

        var material = new THREE.LineBasicMaterial({ color: 0x0000FF });
        var tempLine = new THREE.Line(geometry, material);
        if (isOnPressed) {
            tempLine.name = "tempPressedLine";
            tempPressedLineNum += 1;
        } else {
            tempLine.name = "tempLine";
        }

        return tempLine;
    },


    /**
     *@brief 按给定点用线绘制指定图形
     */
    drawGraphLine: function ( pointsArray ) {
        var self = this;

        var sdLine = scene.getObjectByName( name );
        if ( sdLine === undefined ) {
            var sdLine = new THREE.Object3D();
            sdLine.name = "XXXXXX";
        }

        if ( sdLine !== undefined && sdLine instanceof THREE.Object3D ) {
            var sdLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
            var sdLineGeometry = new THREE.BufferGeometry();
            var tempLine = self.drawLineSegments( sdLineGeometry, sdLineMaterial, pointsArray );
            sdLine.add( tempLine );
            self.clearTempFlake();
        }

        return sdLine;
    },


    /**
     *@brief 隐藏场景上指定的物体
     */
    hideSpecObjectOnSence: function (object, objectName, whetherHide, whetherRender) {
        var hideGroup = object.getObjectByName(objectName);
        if (hideGroup !== undefined && hideGroup instanceof THREE.Object3D) {
            if (whetherHide === true) {
                hideGroup.visible = false;
            } else {
                hideGroup.visible = true;
            }
        }
        if (whetherRender === true) {
            renderer.render(scene, camera);
        }
    },


    /**
     *@brief 绘制字体(Qt)
     */
    drawName: function ( object, name, worldCoorX, worldCoorY, worldCoorZ, textureSource ) {
        var fontGeometry = new THREE.BoxGeometry( 60, 60, 2 );
        var texture = new THREE.QtQuickItemTexture( textureSource );
        var material = new THREE.MeshBasicMaterial( { map: texture } );
        material.transparent = true;
        material.opacity = 0.2;
        var font = new THREE.Mesh( fontGeometry, material );
        font.position.x = worldCoorX / gCoordPrecision;
        font.position.y = worldCoorY / gCoordPrecision;
        font.position.z = worldCoorZ / gCoordPrecision - 15;
        font.name = name;
        object.add(font);
        renderer.render(scene, camera);
        fontGeometry = null;
        font = null;
    },


    /**
     *@brief 鼠标点击(选中)某个物体时高亮
     */
    onMouseClickObject: function ( event ) {
        //声明射线和mouse变量
        var raycaster = new THREE.Raycaster();
        var mouse = new THREE.Vector2();
        //通过鼠标点击的位置计算出射线所需要的点的位置，以屏幕中心为原点，值的范围为-1到1.
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        //根据在屏幕的二维位置以及相机的矩阵更新射线的位置
        raycaster.setFromCamera(mouse, camera);
        // 获取射线直线和所有模型相交的数组集合
        var intersects = raycaster.intersectObjects(scene.children, true); //增加第二个参数，可以遍历子子孙孙对象
        //intersects是返回的一个数组，如果当前位置没有可选中的对象，那这个数组为空，否则为多个对象组成的数组，排列顺序为距离屏幕的距离从近到远的顺序排列
        //数组的每一个子对象内包含：
        // distance：距离屏幕的距离
        // face：与射线相交的模型的面
        // faceIndex：与射线相交的模型的面的下标
        // object：与射线相交的模型对象
        // point：射线与模型相交的点的位置坐标
        // uv：与射线相交的模型的面的uv映射位置
        console.log(intersects);
        //将所有的相交的模型的颜色设置为红色，如果只需要将第一个触发事件，那就数组的第一个模型改变颜色即可
        /*for (var i = 0; i < intersects.length; i++) {
            intersects[i].object.material.color.set(0xff0000);
        }*/
        //判断当前数组是否为空,不为空则获取最近的的模型，将其颜色修改为红色
        if(intersects.length > 0){
            intersects[0].object.material.color.set(0xff0000);
        }
    },


};
