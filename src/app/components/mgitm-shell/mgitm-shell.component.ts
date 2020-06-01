import { Component, OnDestroy, OnInit } from '@angular/core';

import { Subscription } from 'rxjs';

import { InSituDataService } from '../../services/in-situ-data/in-situ-data.service';
import { MgitmDataService } from '../../services/mgitm-data/mgitm-data.service';

/**
 * <mgitm-shell> component:
 * The M-GITM shell is created and oriented from this component.
 * It takes data from the <mgitm-data> and <in-situ-data> components
 * to correctly implement the M-GITM shell into the Cesium viewer.
 *
 * This component is housed by the <cesium-initializer> component
 */
@Component({
    selector: 'app-mgitm-shell',
    templateUrl: './mgitm-shell.component.html',
    styleUrls: [ './mgitm-shell.component.scss' ]
})
export class MgitmShellComponent implements OnInit, OnDestroy {

    viewer;
    shellPrimitive = new Cesium.Primitive();
    canvas = document.createElement( 'canvas' );
    context = this.canvas.getContext( '2d' );

    mgitmDataReadySubscription: Subscription;
    kpDataReadySubscription: Subscription;

    constructor(
        private inSituDataService: InSituDataService,
        private mgitmDataService: MgitmDataService
    ) { }

    /**
     * ngOnInit()
     * Sets the viewer and waits for the KP data to finish loading
     */
    ngOnInit() {
        this.viewer = this.inSituDataService.viewer;
        this.loadKpData();
    }

    /**
     * ngOnDestroy()
     * This makes sure the primitives we previously loaded are either removed,
     * or confirmed removed if the past viewer was destroyed
     */
    ngOnDestroy() {
        if ( !this.viewer.isDestroyed() ) {
            if ( this.viewer.scene.primitives.contains( this.shellPrimitive ) ) {
                this.viewer.scene.primitives.remove( this.shellPrimitive );
            }
        }
    }

    /**
     * loadKpData()
     * Holds on loading the M-GITM shell until the KP data loads,
     * once the KP data finishes loading it calls to wait for the M-GITM data to load
     */
    loadKpData() {
        if ( this.inSituDataService.kpReadyBool ) {
            this.loadMgitmData();
        } else {
            this.kpDataReadySubscription = this.inSituDataService.getKpDataReady$().subscribe( val => {
                if ( val ) {
                    this.loadMgitmData();
                    this.kpDataReadySubscription.unsubscribe();
                }
            });
        }
    }

    /**
     * loadMgitmData()
     * Holds on loading the M-GITM shell until the M-GITM data loads,
     * once it finishes loading we call to load the M-GITM shell.
     */
    loadMgitmData() {
        if ( this.mgitmDataService.dataReady ) {
            this.createMgitmShell();
        } else {
            this.mgitmDataReadySubscription = this.mgitmDataService.getMgitmDataReady$().subscribe( val => {
                if ( val ) {
                    this.createMgitmShell();
                    this.mgitmDataReadySubscription.unsubscribe();
                }
            });
        }
    }

    /**
     * createMgitmShell()
     * This function populates our canvas object with colors based on the data
     * at each specific pixel. This canvas object is then wrapped around a Cesium
     * ellipsoid primitive and displayed in the Cesium viewer.
     *
     * Opting to use a Cesium primitive rather than entity due to primitives loading
     * image material faster than entities. If we use an entity, our rotation function is called
     * so often that the entity doesn't have any time to update itself, and loads as a white sphere
     * instead of the wrapped canvas image.
     */
    createMgitmShell() {
        const height = this.mgitmDataService.pixelArray.length;
        const width = this.mgitmDataService.pixelArray[ 0 ].length;
        this.canvas.height = height;
        this.canvas.width = width;
        const imageDataObject = this.context.createImageData( width, height );
        const imageData = imageDataObject.data;

        let baseIndex = -1;
        this.mgitmDataService.pixelArray.forEach( ( row, rowIndex ) => {
            row.forEach( ( color, colIndex ) => {
                baseIndex = ( rowIndex * width + colIndex ) * 4;

                imageData[ baseIndex ] = color.red * 255;
                imageData[ baseIndex + 1 ] = color.green * 255;
                imageData[ baseIndex + 2 ] = color.blue * 255;
                imageData[ baseIndex + 3 ] = 127.5;
            });
        });
        this.context.putImageData( imageDataObject, 0, 0 );
        if ( !this.viewer.isDestroyed() ) {
            /**
             * Calculated radius uses altitude selected * 1000 for km to m conversion,
             * adds the radius of the cesium globe and adds 10000 (random val) to keep from clipping with globe at lowest elevation
             */
            const radius = ( +this.mgitmDataService.altitudeSelected * 1000 ) + this.viewer.scene.globe.ellipsoid.maximumRadius + 10000;
            this.shellPrimitive = new Cesium.Primitive({
                geometryInstances: new Cesium.GeometryInstance({
                    geometry: new Cesium.EllipsoidGeometry({
                        radii: new Cesium.Cartesian3( radius, radius, radius )
                    })
                }),
                appearance: new Cesium.EllipsoidSurfaceAppearance({
                    material: new Cesium.Material({
                        fabric: {
                            type: 'Image',
                            uniforms: {
                                image: this.canvas,
                                // no repeats
                                repeat: new Cesium.Cartesian2( 1.0, 1.0 )
                            }
                        }
                    }),
                    translucent: true
                })
            });
            this.viewer.scene.primitives.add( this.shellPrimitive );
            this.rotateMgitmShell();
        }
    }

    /**
     * computeRotationMatrix()
     * We calculate the rotation by taking the M-GITM subsolar point,
     * provided by the <mgitm-data> service and rotating it to equal the
     * KP subsolar point.
     * We do two rotations, one for latitude and one for longitude.
     * For longitude, we rotate on the North-South axis, but for latitude
     * we have to calculate our rotation axis due to not having a North-South
     * pole axis to base rotation on.
     */
    computeRotationMatrix( time, result ) {
        const subSolarPositions = this.inSituDataService.subSolarPositions;
        result = result || new Cesium.Quaternion();
        if ( !subSolarPositions ) {
            // if no KP subsolar positions are available, don't compute rotation
            return Cesium.Quaternion.clone(
                Cesium.Quaternion.IDENTITY,
                result
            );
        }
        let kpSubsolarPosition;
        kpSubsolarPosition = subSolarPositions.getValue( time, kpSubsolarPosition );
        if ( kpSubsolarPosition ) {
            let kpCartographic = new Cesium.Cartographic();
            kpCartographic = Cesium.Cartographic.fromCartesian(
                kpSubsolarPosition,
                this.viewer.scene.globe.ellipsoid,
                kpCartographic
            );
            const kpLat = Cesium.Math.toDegrees( kpCartographic.latitude );
            const kpLng = Cesium.Math.toDegrees( kpCartographic.longitude );

            const subsolarLatLong = this.mgitmDataService.getMgitmSubsolarPoint();
            const mgitmLat = subsolarLatLong.lat;
            const mgitmLng = subsolarLatLong.lng;

            // First rotation, line up longitudes
            let rotation1 = new Cesium.Quaternion();
            rotation1 = Cesium.Quaternion.fromAxisAngle(
                new Cesium.Cartesian3( 0, 0, 1 ),
                Cesium.Math.toRadians( kpLng - mgitmLng ),
                rotation1
            );

            // calculate the latitude rotation axis
            let latRotationCartesian = new Cesium.Cartesian3();
            if ( !subSolarPositions ) {
                return Cesium.Cartesian3.clone(
                    Cesium.Cartesian3.UNIT_Z,
                    result
                );
            }
            latRotationCartesian = Cesium.Cartesian3.cross(
                Cesium.Cartesian3.UNIT_Z,
                kpSubsolarPosition,
                latRotationCartesian
            );

            // Second rotation: line up latitudes
            let rotation2 = new Cesium.Quaternion();
            rotation2 = Cesium.Quaternion.fromAxisAngle(
                latRotationCartesian,
                Cesium.Math.toRadians( mgitmLat - kpLat ),
                rotation2
            );
            result = Cesium.Quaternion.multiply( rotation2, rotation1, result );
        }
        return result;
    }

    /**
     * rotateMgitmShell()
     * Adds event listener to constantly adjust the shell alignment in the viewer.
     * Grabs the rotation matrix from computeRotationMatrix() and sets it the shell's
     * modelMatrix attribute.
     */
    rotateMgitmShell() {
        const clock = this.viewer.clock;
        const scaleIdentity = new Cesium.Cartesian3( 1, 1, 1 );
        let rotationMatrix = new Cesium.Matrix4();
        let rotation = new Cesium.Quaternion();
        clock.onTick.addEventListener( () => {
            rotation = this.computeRotationMatrix( clock.currentTime, rotation );

            rotationMatrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
                Cesium.Cartesian3.ZERO,
                rotation,
                scaleIdentity,
                rotationMatrix
            );
            if ( this.shellPrimitive ) {
                rotationMatrix.clone( this.shellPrimitive.modelMatrix );
            }
        });
    }
}
