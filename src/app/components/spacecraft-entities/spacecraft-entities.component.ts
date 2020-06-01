import { Component, OnDestroy, OnInit } from '@angular/core';

import * as moment from 'moment';
import { Subscription } from 'rxjs';

import { IDateInfo, IPathColorData, IWhiskerData } from '../../models/index';
import { ColorsService } from '../../services/colors/colors.service';
import { DatasetInitializerService } from '../../services/dataset-initializer/dataset-initializer.service';
import { InSituDataService } from '../../services/in-situ-data/in-situ-data.service';
import { LatisService } from '../../services/latis/latis.service';

/**
 * <spacecraft-entities> component:
 * All Cesium entities and primitives (spacecrafts, orbit paths and whiskers)
 * are added to the main viewer in this component. The 1D and 3D parameters
 * chosen in the control panel are also handeled in this component.
 * Calculations for each of these parameters either take place in this component
 * or in helper functions found in the <in-situ-data> service
 *
 * This component is housed by the <cesium-initializer> component
 */
@Component({
    selector: 'app-spacecraft-entities',
    templateUrl: './spacecraft-entities.component.html',
    providers: [],
    styleUrls: [ './spacecraft-entities.component.scss' ]
})
export class SpacecraftEntitiesComponent implements OnInit, OnDestroy {

    isInertial = this.inSituDataService.referenceFrame === 'inertial';
    currentDates = this.latisService.currentDates;
    selectedDates: IDateInfo = {
        start: moment.utc( this.currentDates.start ).format( 'YYYY-MM-DD' ),
        end: moment.utc( this.currentDates.end ).format( 'YYYY-MM-DD' )
    };

    orbitWhiskersCollection = new Cesium.PrimitiveCollection();
    orbitPathPrimitive = new Cesium.Primitive();
    orbitEntity = new Cesium.Entity();
    groundTrackEntity = new Cesium.Entity();
    viewer = this.inSituDataService.viewer;
    ephemerisSubscription: Subscription;
    groundTrackSubscription: Subscription;
    // Initiliaze to 11671, the amount of orbit positions displayed in a 24 hour period
    param1dData: String[] = new Array<String>( 11671 );

    constructor(
        private colorService: ColorsService,
        public datasetInitializerService: DatasetInitializerService,
        private inSituDataService: InSituDataService,
        private latisService: LatisService
    ) {}

    /**
     * ngOnInit()
     * Tells the app the viewer is no longer ready and calls for the
     * Cesium properties to be loaded into the viewer.
     */
    ngOnInit() {
        this.datasetInitializerService.viewerReady.next( false );
        this.viewer = this.inSituDataService.viewer;
        this.initializeOrbitData();
    }

    /**
     * ngOnDestroy()
     * Removes entities that currently exist throughout the main viewer if the
     * viewer is not yet destroyed
     */
    ngOnDestroy() {
        if ( !this.viewer.isDestroyed() ) {
            if ( this.viewer.entities.contains( this.orbitEntity ) ) {
                this.viewer.entities.remove( this.orbitEntity );
            }
            if ( this.viewer.entities.contains( this.groundTrackEntity ) ) {
                this.viewer.entities.remove( this.groundTrackEntity );
            }
            if ( this.viewer.scene.primitives.contains( this.orbitPathPrimitive ) ) {
                this.viewer.scene.primitives.remove( this.orbitPathPrimitive );
            }
            if ( this.viewer.scene.primitives.contains( this.orbitWhiskersCollection ) ) {
                this.viewer.scene.primitives.remove( this.orbitWhiskersCollection );
            }
        }
        if ( this.groundTrackSubscription ) {
            this.groundTrackSubscription.unsubscribe();
        }
    }

    /**
     * initializeOrbitDataHelper()
     * Helper function to initializeOrbitData to decide which sets
     * of data to load based on 1D and 3D parameters selected
     */
    initializeOrbitDataHelper() {
        this.addGroundTrack();
        if ( this.datasetInitializerService.stored3dParam !== '' ) {
            this.add3dWhiskers();
        }
        if ( this.datasetInitializerService.stored1dParam !== '' ) {
            this.add1dParam();
        } else {
            if ( !this.viewer.isDestroyed() ) {
                this.reloadData();
            }
        }
    }

    /**
     * initializeOrbitData()
     * Calls helper function if kp data has finished loading in
     * <in-situ-data> service. If not, subscribes and waits for data to finish loading
     */
    initializeOrbitData() {
        if ( this.inSituDataService.kpReadyBool ) {
            this.initializeOrbitDataHelper();
        } else {
            this.ephemerisSubscription = this.inSituDataService.getKpDataReady$().subscribe( ( val ) => {
                if ( val ) {
                    this.initializeOrbitDataHelper();
                    this.ephemerisSubscription.unsubscribe();
                }
            });
        }
    }

    /**
     * addGroundTrack()
     * This function is in charge of adding the ground track to the Cesium viewer.
     * There are a lot of checks in this function to make sure the viewer isn't destroyed,
     * or doesn't contain similar entities. We need these checks in this function but not others in this component
     * Due to this being the only entity we can constantly add and remove without reloading the entire component.
     * Every other entity produced in this component doesn't need these checks as it will get deleted when the
     * component itself does.
     */
    addGroundTrack() {
        this.groundTrackSubscription = this.inSituDataService.getShowGroundTrack$().subscribe( ( val ) => {
            this.viewer = this.inSituDataService.viewer;
            if ( val ) {
                const GROUND_TRACK_COLOR = Cesium.Color.BLACK.withAlpha( 0.50 );
                if ( !this.viewer.isDestroyed()) {
                    const remainingEntity = this.viewer.entities.getById( 'groundTrackEntity' );
                    if ( remainingEntity ) {
                        this.viewer.entities.remove( remainingEntity );
                    }
                    this.groundTrackEntity = this.viewer.entities.add({
                        id: 'groundTrackEntity',
                        position: this.inSituDataService.groundTrackPositions,
                        path: {
                            // lead in trail time is all seconds of a day to always dispkay full path
                            leadTime: new Cesium.ConstantProperty(86400),
                            trailTime: new Cesium.ConstantProperty(86400),
                            material: GROUND_TRACK_COLOR,
                            width: 3,
                            resolution: 60
                        },
                        point: {
                            color: GROUND_TRACK_COLOR,
                            pixelSize: 6
                        },
                        polyline: {
                            followSurface: false,
                            positions: new Cesium.PositionPropertyArray([
                                new Cesium.ReferenceProperty.fromString(
                                    this.viewer.entities,
                                    'orbitEntity#position'
                                ),
                                new Cesium.ReferenceProperty.fromString(
                                    this.viewer.entities,
                                    'groundTrackEntity#position'
                                )
                            ]),
                            material: this.colorService.gray,
                            width: 3
                        }
                    });
                }
            } else {
                if ( this.viewer.entities.contains( this.groundTrackEntity ) && !this.viewer.isDestroyed()) {
                    this.viewer.entities.remove( this.groundTrackEntity );
                }
            }
        });
    }

    /**
     * add1dParam()
     * Creates specific LaTiS url based on selected 1D parameter then
     * retrieves that data from LaTiS and sends it to a helper function in the
     * <in-situ-data> service
     */
    add1dParam() {
        let param1dUrl = '';
        if ( this.datasetInitializerService.stored1dParam === '' ) {
            this.param1dData = new Array<string>( this.inSituDataService.spacecrafts.positions.length );
        } else {
            const selectedDates = this.latisService.currentDates;
            const dateString = 'time>' + moment.utc( selectedDates.start ).format( 'YYYY-MM-DD' )
                + '&time<' + moment.utc( selectedDates.end ).format( 'YYYY-MM-DD' );

            const plotList = this.datasetInitializerService.plotList;
            for ( let i = 0; i < plotList.length; i++ ) {
                if ( plotList[ i ].name === this.datasetInitializerService.stored1dParam ) {
                    param1dUrl = plotList[ i ].url + dateString;
                    break;
                }
            }
        }
        this.latisService.get( param1dUrl ).subscribe( ( data: IPathColorData ) => {
            this.param1dData = this.inSituDataService.getParam1dData( data );
            if ( !this.viewer.isDestroyed() ) {
                this.reloadData();
            }
        });
    }

    /**
     * add3dWhiskers()
     * Creates specific LaTiS url based on selected 3D parameter then
     * retrieves that data from LaTiS and sends it to a helper function in
     * <in-situ-data> service. This returns a primitive collection to add to the viewer
     */
    add3dWhiskers() {
        let param3dUrl = '';
        if ( this.datasetInitializerService.stored3dParam === '' ) {
            this.param1dData = new Array<string>( this.inSituDataService.spacecrafts.positions.length );
        } else {
            const selectedDates = this.latisService.currentDates;
            const dateString = 'time>' + moment.utc( selectedDates.start ).format( 'YYYY-MM-DD' )
                + '&time<' + moment.utc( selectedDates.end ).format( 'YYYY-MM-DD' );
            const plotList = this.datasetInitializerService.plotList;
            for ( let i = 0; i < plotList.length; i++ ) {
                if ( plotList[ i ].name === this.datasetInitializerService.stored3dParam ) {
                    param3dUrl = plotList[ i ].url + dateString;
                    break;
                }
            }
            // If reference frame is inertial, we need the spice matrix to be loaded
            if ( this.inSituDataService.spiceMatrixReadyBool || !this.isInertial) {
                this.add3dWhiskersHelper( param3dUrl );
            } else {
                this.inSituDataService.getSpiceMatrixReady$().subscribe( ( val ) => {
                    if ( val ) {
                        this.add3dWhiskersHelper( param3dUrl );
                    }
                });
            }
        }
    }

    add3dWhiskersHelper( param3dUrl ) {
        this.latisService.get( param3dUrl ).subscribe( ( data: IWhiskerData ) => {
            this.orbitWhiskersCollection = this.inSituDataService.transformWhiskerData( data );
            this.viewer.scene.primitives.add( this.orbitWhiskersCollection );
        });
    }

    /**
     * reloadData()
     * Adds the spacecraft entity and orbit path primtives to the main viewer.
     * The camera will also adjust so that all entities and primitives are in
     * view of the camera after being added to the viewer.
     * The function will end by telling the <dataset-initializer> service
     * the primitive path has finished loading.
     */
    reloadData() {
        const remainingEntity = this.viewer.entities.getById( 'orbitEntity' );
        if ( remainingEntity ) {
            this.viewer.entities.remove( remainingEntity );
        }
        this.orbitEntity = this.viewer.entities.add( new Cesium.Entity({
            id: 'orbitEntity',
            position: this.inSituDataService.spacecrafts.transformed,
            model: {
                uri: './assets/3dmodels/maven.glb',
                minimumPixelSize: 100
            }
        }));
        // positions camera to see all entities displayed
        const positions = this.inSituDataService.spacecrafts.positions;
        if ( this.datasetInitializerService.stored1dParam === '' ) {
            this.param1dData = new Array<String>( positions.length );
        }
        if ( Cesium.defined( this.viewer.primitives ) ) {
            this.viewer.primitives.removeAll();
        }
        const orbitPathPrimitive = this.viewer.scene.primitives.add(
            new Cesium.Primitive({
                geometryInstances: new Cesium.GeometryInstance({
                    geometry: new Cesium.PolylineGeometry({
                        width: 4,
                        positions: positions,
                        colors: this.colorService.interpolateArray( this.param1dData, true )
                    })
                }),
                appearance: new Cesium.PolylineColorAppearance()
            })
        );
        this.orbitPathPrimitive = orbitPathPrimitive;

        if ( this.isInertial ) {
            this.rotateInertialPathData();
        }

        // Tells rest of the app when viewer fully loads
        const readyPromise = this.orbitPathPrimitive.readyPromise;
        readyPromise.then( () => {
            this.datasetInitializerService.viewerReady.next( true );
        });
    }

    /**
     * rotateInertialPathData()
     * Referenced in reloadData() to rotate newly created orbit path
     * primitives on an inertial reference frame.
     * Uses an event listener to adjust its position around a Cesium defined matrix
     */
    rotateInertialPathData() {
        const clock = this.viewer.clock;
        const toInertial = new Cesium.Matrix3();
        let rotatingOrbitPath = new Cesium.Matrix4();

        if ( this.isInertial ) {
            clock.onTick.addEventListener( () => {
                if ( !Cesium.defined( Cesium.Transforms.computeIcrfToFixedMatrix( clock.currentTime, toInertial ))) {
                    Cesium.Matrix3.IDENTITY.clone( toInertial );
                }
                rotatingOrbitPath = Cesium.Matrix4.fromRotationTranslation(
                    toInertial,
                    Cesium.Cartesian3.ZERO,
                    rotatingOrbitPath
                );

                if ( this.orbitPathPrimitive ) {
                    rotatingOrbitPath.clone( this.orbitPathPrimitive.modelMatrix );
                }

                if ( this.orbitWhiskersCollection ) {
                    const len = this.orbitWhiskersCollection.length;
                    for ( let i = 0; i < len; i++ ) {
                        const whiskerPrimitive = this.orbitWhiskersCollection.get(i);
                        rotatingOrbitPath.clone( whiskerPrimitive.modelMatrix );
                    }
                }
            });
        }
    }
}
