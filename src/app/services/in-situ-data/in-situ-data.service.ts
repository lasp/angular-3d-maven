import { Injectable } from '@angular/core';
import { cloneDeep } from 'lodash';
import * as moment from 'moment';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';

import { getKpMatrix3Params, IInSituData, IPathColorData, IWhiskerData, MAVEN_CONSTANTS } from '../../models/index';
import { ColorsService } from '../colors/colors.service';
import { LatisService } from '../latis/latis.service';

/**
 * <in-situ-data> service:
 * All ephemeris data is pre-loaded in this service and formatted for use
 * by the componenets responsible for creating Cesium entities.
 * The majority of data handling from 1D and 3D parameter data also takes
 * place in this service.
 */
@Injectable({
    providedIn: 'root'
})
export class InSituDataService {

    // Set to cesium viewer in <cesium-initializer> component
    viewer;

    referenceFrame = 'inertial';
    referenceFrames: Subject<String> = new Subject<String>();
    referenceFrame$ = this.referenceFrames.asObservable();
    kpDataReady: Subject<Boolean> = new Subject<Boolean>();
    kpDataReady$ = this.kpDataReady.asObservable();
    ephemerisData: IInSituData;
    kpReadyBool = false;

    julianDates = [];
    orbitWhiskerCollection = new Cesium.PrimitiveCollection();
    msoToGeoMatricies = [];
    spiceMatrixReady: Subject<Boolean> = new Subject<Boolean>();
    spiceMatrixReady$ = this.spiceMatrixReady.asObservable();
    spiceMatrixReadyBool = false;

    kpDataSubscription: Subscription;
    spiceMatrixSubscription: Subscription;

    spacecrafts = {
        ephemeris: this.ephemerisData,
        transformed: new Cesium.SampledPositionProperty,
        positions: [],
        loaded: false
    };

    // Solar properties used to track the sun and interpret M-GITM data
    solarLongitude: number;
    solarZenithAngles = new Cesium.SampledProperty(Number);
    solarPositions = new Cesium.SampledPositionProperty();
    subSolarPositions = new Cesium.SampledPositionProperty();
    // When lighting the planet, cesium lighting using the opposite side of our normal subSolarPositions
    subSolarOpposHemisPositions = new Cesium.SampledPositionProperty();

    groundTrackPositions = new Cesium.SampledPositionProperty();
    showGroundTrack: BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>( true );
    showGroundTrack$ = this.showGroundTrack.asObservable();

    showSubSolarPoint: BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>( true );
    showSubSolarPoint$ = this.showSubSolarPoint.asObservable();

    constructor(
        private colorsService: ColorsService,
        private latisService: LatisService
    ) {
        this.showGroundTrack.next( true );
        this.setReferenceFrame( this.referenceFrame );
        this.latisService.getSelectedDateRange$().subscribe( () => {
            this.getKpData();
            this.preloadSpiceMatrix();
        });
    }

    /**
     * setReferenceFrame()
     * Sets new reference frame when called and re-transforms ephemeris data
     * to fit with new reference frame
     */
    setReferenceFrame( rf: string ) {
        this.referenceFrame = rf;
        this.kpReadyBool = false;
        this.kpDataReady.next( false );
        this.referenceFrames.next( this.referenceFrame );
        if ( this.referenceFrame === 'inertial' ) {
            this.spacecrafts.transformed = new Cesium.SampledPositionProperty( Cesium.ReferenceFrame.INERTIAL );
        } else {
            this.spacecrafts.transformed = new Cesium.SampledPositionProperty();
        }
        this.spacecrafts.loaded = false;
        if ( this.spacecrafts.ephemeris ) {
            Promise.resolve( this.transformKpData( this.spacecrafts.ephemeris ) ).then( () => {
                this.spacecrafts.loaded = true;
                this.kpReadyBool = true;
                this.kpDataReady.next( true );
            });
        }
    }

    /**
     * getKpDataHelper()
     * Helper function for getKpData()
     * Used to check if all Kp data has been pre loaded,
     * and in turn Cesium entities can begin loading
     */
    getKpDataHelper() {
        let test = true;
        if ( !this.spacecrafts.loaded ) {
            test = false;
        }
        if ( test ) {
            this.kpDataReady.next( true );
            this.kpReadyBool = true;
        }
    }

    /**
     * getKpData()
     * This is where Kp Data should be pre loaded for the spacecraft and sun entities
     * in the main Cesium viewer.
     * Specifically loads the longitude, latitude, and altitude for the maven spacecraft
     * and the sun's position in relation to Mars' orbit
     */
    getKpData() {
        if ( this.kpDataSubscription ) {
            this.kpDataSubscription.unsubscribe();
        }
        this.kpReadyBool = false;
        this.kpDataReady.next( false );

        const selectedMoments = {
            start: moment.utc( this.latisService.currentDates.start ).format( 'YYYY-MM-DD' ),
            end: moment.utc( this.latisService.currentDates.end ).format( 'YYYY-MM-DD' )
        };
        const ephemerisUrl = this.latisService.getUrl(
            'in_situ_kp_spice',
            'jsond',
            'time,' + MAVEN_CONSTANTS.ORBIT_ALTITUDE + ',' + MAVEN_CONSTANTS.ORBIT_LAT + ',' + MAVEN_CONSTANTS.ORBIT_LONG
                + ',' + MAVEN_CONSTANTS.SUN_DISTANCE + ',' + MAVEN_CONSTANTS.SUBSOLAR_LAT + ',' + MAVEN_CONSTANTS.SUBSOLAR_LONG
                + ',' + MAVEN_CONSTANTS.SOLAR_LONG + ',' + MAVEN_CONSTANTS.SOLAR_ZENITH_ANG,
            [ 'time>' + selectedMoments.start, 'time<' + selectedMoments.end ]
        );
        this.kpDataSubscription = this.latisService.get( ephemerisUrl ).subscribe( ( data: IInSituData ) => {
            this.spacecrafts.ephemeris = data;
            Promise.resolve( this.transformKpData( data ) ).then( () => {
                this.spacecrafts.loaded = true;
                this.getKpDataHelper();
            });
        });
    }

    /**
     * getReferenceFrame$()
     * Observable for detecting changes to the reference frame
     */
    getReferenceFrame$(): Observable<String> {
        return this.referenceFrame$;
    }

    /**
     * getKpDataReady$()
     * Observable for detecting the kp data has finished loading
     */
    getKpDataReady$(): Observable<Boolean> {
        return this.kpDataReady$;
    }

    /**
     * getSpiceMatrixReady$()
     * Observable for detecting when the spice matrix has finished loading.
     */
    getSpiceMatrixReady$(): Observable<Boolean> {
        return this.spiceMatrixReady$;
    }

    /**
     * getShowGroundTrack$()
     * Observable for determining whether the ground track should be shown
     */
    getShowGroundTrack$(): Observable<Boolean> {
        return this.showGroundTrack$;
    }

    /**
     * getShowSubSolarPoint$()
     * Observable for determining whether the sub-solar point should be shown
     */
    getShowSubSolarPoint$(): Observable<Boolean> {
        return this.showSubSolarPoint$;
    }

    /**
     * transformKpData()
     * Called while the Kp data is preloaded to convert the LaTiS
     * data to Cesium data objects to be used by Cesium entities and primitives.
     * This function also converts data based on reference frame.
     *
     * The columns in the Data object are as follows:
     * 0 : Timestamp
     * 1 : Solar Longitude
     * 2 : Subsolar Altitude
     * 3 : Spacecraft Altitude
     * 4 : Spacecraft latitude
     * 5 : Spacecraft longitude
     * 6 : Solar Zenith Angle
     * 7 : Subsolar Latitude
     * 8 : Subsolar Longitude
     */
    transformKpData( data: IInSituData ) {
        const isInertial = this.referenceFrame === 'inertial';
        const toInertial = new Cesium.Matrix3();
        this.julianDates = [];
        this.spacecrafts.positions = [];
        let solarLongitudeSum = 0;

        const latisData = cloneDeep( data.in_situ_kp_spice.data );
        latisData.forEach( ( row: string ) => {
            // Multiplication converting Km to m
            const spacecraftPosition = new Cesium.Cartesian3.fromDegrees(
                +row[ 5 ],
                +row[ 4 ],
                +row[ 3 ] * 1000,
                MAVEN_CONSTANTS.MARSIAU2000
            );
            // Altitude of 10 to keep from being directly on surface
            const groundPosition = MAVEN_CONSTANTS.MARSIAU2000.cartographicToCartesian(
                new Cesium.Cartographic.fromDegrees(
                    +row[ 5 ],
                    +row[ 4 ],
                    100
                )
            );
            // Multiplication rough conversion from AU to meters, slightly adjusted to work best with viewer
            const sunPosition = new Cesium.Cartesian3.fromDegrees(
                +row[ 8 ],
                +row[ 7 ],
                +row[ 2 ] * 1496000000,
                MAVEN_CONSTANTS.MARSIAU2000
            );
            // 80000 being a small height to keep the image off the ground
            const subSolarPosition = MAVEN_CONSTANTS.MARSIAU2000.cartographicToCartesian(
                new Cesium.Cartographic.fromDegrees(
                    +row[ 8 ],
                    +row[ 7 ],
                    80000
                )
            );
            // adding 180 to transform to opposite side of the hemisphere
            const oppositeHemispherePosition = MAVEN_CONSTANTS.MARSIAU2000.cartographicToCartesian(
                new Cesium.Cartographic.fromDegrees(
                    +row[ 8 ] + 180,
                    -row[ 7 ],
                    0
                )
            );
            // Summing all solarLongitude values up to calculate mean at the end of the function
            solarLongitudeSum = solarLongitudeSum + +row[ 1 ];

            const julianDate = Cesium.JulianDate.fromDate( new Date( row[ 0 ] ) );
            this.julianDates.push( julianDate );

            if ( isInertial ) {
                if ( Cesium.defined(
                    Cesium.Transforms.computeFixedToIcrfMatrix( julianDate, toInertial )
                )) {
                    Cesium.Matrix3.multiplyByVector( toInertial, spacecraftPosition, spacecraftPosition );
                }
            }
            this.spacecrafts.transformed.addSample( julianDate, spacecraftPosition );
            this.spacecrafts.positions.push( spacecraftPosition );
            this.groundTrackPositions.addSample( julianDate, groundPosition );
            this.solarZenithAngles.addSample( julianDate, row[ 6 ] );
            this.solarPositions.addSample( julianDate, sunPosition );
            this.subSolarPositions.addSample( julianDate, subSolarPosition );
            this.subSolarOpposHemisPositions.addSample( julianDate, oppositeHemispherePosition );
        });
        // We only need the mean of the solar longitude for our M-GITM LaTiS call
        this.solarLongitude = solarLongitudeSum / latisData.length;
    }

    /**
     * preloadSpiceMatrix()
     * This specific spice matrix is needed to correctly rotate the 3D whiskers when the reference frame
     * value is 'inertial'. However we can preload this on startup or whenever a new date is selected.
     * This function configures the latis url and makes the data call, sending the data it receives to
     * the transform function.
     */
    preloadSpiceMatrix() {
        this.spiceMatrixReadyBool = false;
        this.spiceMatrixReady.next( false );
        if ( this.spiceMatrixSubscription ) {
            this.spiceMatrixSubscription.unsubscribe();
        }
        const selectedDates = this.latisService.currentDates;
        // must add spice data manually to not interupt Scicharts plots
        const spiceMatrix = getKpMatrix3Params( MAVEN_CONSTANTS.IAU_TO_MSO_MATRIX ).join( ',' );
        const spiceMatrixUrl = this.latisService.getUrl(
            'in_situ_kp_spice',
            'jsond',
            spiceMatrix,
            [ 'time>' + moment.utc( selectedDates.start ).format( 'YYYY-MM-DD' ),
                'time<' + moment.utc( selectedDates.end ).format( 'YYYY-MM-DD' ) ]
        );
        this.spiceMatrixSubscription = this.latisService.get( spiceMatrixUrl ).subscribe( ( data: IInSituData ) => {
            this.transformSpiceMatrixData( data );
        });
    }

    /**
     * transformSpiceMatrixData()
     * This function converts the matrix data in rotation matricies to be used by
     * the individual whisker vectors, to rotate them to their correct position.
     */
    transformSpiceMatrixData( data: IInSituData ) {
        const matrixData = cloneDeep( data.in_situ_kp_spice.data );

        let msoToGeo = new Cesium.Matrix3();
        let geoToMsoArray = [];
        let geoToMsoMatrix = new Cesium.Matrix3();
        this.msoToGeoMatricies = [];
        matrixData.forEach( ( row: string ) => {
            geoToMsoArray = [];
            for ( let i = 0; i < 9; i++ ) {
                geoToMsoArray.push( row[ i ] );
            }
            geoToMsoMatrix = Cesium.Matrix3.fromRowMajorArray( geoToMsoArray, new Cesium.Matrix3() );
            msoToGeo = Cesium.Matrix3.transpose( geoToMsoMatrix, new Cesium.Matrix3() );
            this.msoToGeoMatricies.push( msoToGeo );
        });
        this.spiceMatrixReadyBool = true;
        this.spiceMatrixReady.next( true );
    }

    /**
     * transformWhiskerData()
     * This returns a Cesium PrimitiveCollection which holds a set of
     * 3D whisker vectors (formatted as Cesium Primitives) to be added to the
     * main viewer in the <spacecraft-entities> component. The primitive
     * collection is created using the 3D parameter data array passed as
     * a parameter.
     *
     * The columns in the data are as follows:
     * 0 : Timestamp
     * 1 : 3D param x
     * 2 : 3D param y
     * 3 : 3D param z
     */
    transformWhiskerData( data: IWhiskerData ) {
        // Find which data array is populated (only one ever will be)
        const whiskerData = cloneDeep(
            data.in_situ_kp_mag ? data.in_situ_kp_mag.data :
            data.in_situ_kp_static ? data.in_situ_kp_static.data :
            data.in_situ_kp_swia.data
        );

        const vectors = [];
        let currentVector = new Cesium.Cartesian3();
        whiskerData.forEach( ( row: string, index ) => {
            const julianDate = Cesium.JulianDate.fromDate( new Date( row[ 0 ] ) );
            currentVector = new Cesium.Cartesian3(
                +row[ 1 ],
                +row[ 2 ],
                +row[ 3 ]
            );

            if ( this.referenceFrame !== 'inertial' ) {
                currentVector = Cesium.Matrix3.multiplyByVector(
                    this.msoToGeoMatricies[ index ],
                    currentVector,
                    new Cesium.Cartesian3()
                );
            }

            const mag = Cesium.Cartesian3.magnitude( currentVector );
            Cesium.Cartesian3.multiplyByScalar( currentVector, Math.log10( mag + 1 ) / mag, currentVector );
            vectors.push( [ julianDate, currentVector ] );
        });

        let minMag = Number.MAX_VALUE;
        let maxMag = -Number.MAX_VALUE;
        const magnitudes = vectors.map( ( row ) => {
            const vector = row[1];
            const mag = Cesium.Cartesian3.magnitude( vector );

            if ( mag < minMag ) { minMag = mag; }
            if ( mag > maxMag ) { maxMag = mag; }

            return mag;
        });

        const vectorColors = this.colorsService.interpolateArray( magnitudes, false );

        const interpolateWhiskerLength = ( magnitude, whiskerVector, result ) => {
            if ( magnitude === 0 ) {
                return Cesium.Cartesian3.clone( whiskerVector, result );
            } else {
                // 5000000 is arbitrary and subject for change, used to appropriately exaggerate whiskers
                const interpolatedMagnitude =
                    ( magnitude - minMag ) /
                    ( maxMag - minMag ) *
                    5000000;

                return Cesium.Cartesian3.multiplyByScalar( whiskerVector, interpolatedMagnitude / magnitude, result );
            }
        };

        const toInertial = new Cesium.Matrix3();
        const fromInertial = new Cesium.Matrix3();
        this.orbitWhiskerCollection = new Cesium.PrimitiveCollection();
        // Dataset provides an overwhelming amount of whiskers, filtering to display every 25
        const WHISKER_FILTER_VALUE = 25;
        vectors.forEach( ( row, index ) => {
            if ( index % WHISKER_FILTER_VALUE === 0 ) {
                const julianDate = row[ 0 ];
                const vector = row[ 1 ];
                const magnitude = magnitudes[ index ];
                const orbitPos = this.spacecrafts.transformed.getValue( julianDate );
                const color = vectorColors[ index ].withAlpha( 0.75 );
                if ( orbitPos ) {
                    if ( this.referenceFrame === 'inertial' ) {
                        if ( !Cesium.defined( Cesium.Transforms.computeIcrfToFixedMatrix( julianDate, toInertial ) ) ) {
                            console.error( 'Failed to get inertial transform' );
                            return;
                        }
                        Cesium.Matrix3.transpose( toInertial, fromInertial );
                        Cesium.Matrix3.multiplyByVector( fromInertial, orbitPos, orbitPos );
                    }

                    const endPoint = new Cesium.Cartesian3();
                    interpolateWhiskerLength( magnitude, vector, endPoint );
                    Cesium.Cartesian3.add( orbitPos, endPoint, endPoint );
                    this.orbitWhiskerCollection.add( new Cesium.Primitive({
                        geometryInstances: new Cesium.GeometryInstance({
                            geometry: new Cesium.PolylineGeometry({
                                positions: [ orbitPos, endPoint ],
                                colors: [ color, color ],
                                width: 1,
                                arcType: Cesium.ArcType.NONE,
                                followSurface: false
                            })
                        }),
                        appearance: new Cesium.PolylineColorAppearance()
                    }));
                }
            }
        });
        return this.orbitWhiskerCollection;
    }

    /**
     * getParam1dData()
     * Takes an array from a LaTiS call to a 1d parameter dataset.
     * Finds out from what dataset this came from, and extracts the actual data values
     * from the object.
     * Fills in any values that don't exist, or fills in arrays that don't
     * have values for each orbit position
     */
    getParam1dData( data: IPathColorData ): String[] {
        const dataArray = cloneDeep( data.in_situ_kp_ngims.data );
        let count = 0;
        let tempData = dataArray[ count ];
        let tempDate = new Date();
        let julianDate = new Cesium.JulianDate();
        if ( dataArray.length < this.julianDates.length ) {
            return this.julianDates.map( ( val ) => {
                if ( count < dataArray.length ) {
                    tempData = dataArray[ count ];
                    tempDate = new Date( tempData[ 0 ] );
                    julianDate = Cesium.JulianDate.fromDate( tempDate );
                    if ( Cesium.JulianDate.equals( val, julianDate ) ) {
                        count = count + 1;
                        return tempData[ 1 ];
                    } else {
                        return '';
                    }
                } else {
                    return '';
                }
            });
        } else {
            return dataArray;
        }
    }

}
