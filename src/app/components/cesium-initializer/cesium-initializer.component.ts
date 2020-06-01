import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { IRange } from 'scicharts';

import { imageryViewModels, MAVEN_CONSTANTS, terrainViewModels } from '../../models/index';
import { ColorsService } from '../../services/colors/colors.service';
import { DatasetInitializerService } from '../../services/dataset-initializer/dataset-initializer.service';
import { InSituDataService } from '../../services/in-situ-data/in-situ-data.service';
import { LatisService } from '../../services/latis/latis.service';
import { MgitmDataService } from '../../services/mgitm-data/mgitm-data.service';

/**
 * <cesium-initializer> component:
 * The creation and destruction of the main Cesium viewer.
 * The main viewer will always be present, but sometimes destroyed and recreated.
 * An example of this would be when the date is changed, as the whole viewer needs
 * to be destroyed in order to account for setting the new correct timeline for
 * both the main and formation viewers. This same process also decides when to
 * load/reload the <spacecraft-entities> component
 *
 * This component is housed by the <app> component.
 * It houses the <spacecraft-entities>, <sun-entities>, and <mgitm-shell> components.
 */
@Component({
    selector: 'app-cesium-initializer',
    templateUrl: './cesium-initializer.component.html',
    providers: [],
    styleUrls: [ './cesium-initializer.component.scss' ]
})
export class CesiumInitializerComponent implements OnInit, OnDestroy {

    // Viewer variables will be assigned to Cesium Viewer when created
    viewer;
    selectedDates: IRange = this.latisService.currentDates;

    // Bools used to reload cesium components
    loadMgitm = false;
    loadSpacecraft = false;
    loadSun = false;

    // Copies of control panel selections to determine if changes occur
    stored1dParamCopy = this.datasetInitializerService.stored1dParam;
    stored3dParamCopy = this.datasetInitializerService.stored3dParam;
    referenceFrameCopy = this.inSituDataService.referenceFrame;
    stored1dColorCopy = this.colorsService.stored1dColor;
    stored3dColorCopy = this.colorsService.stored3dColor;
    storedMgitmColorCopy = this.colorsService.storedMgitmColor;

    dateRangeSubscription: Subscription;
    selectedDatasetsSubscription: Subscription;
    selectedColorsSubscription: Subscription;
    referenceFrameSubscription: Subscription;
    mgitmDataSubscription: Subscription;

    constructor(
        private changeDetector: ChangeDetectorRef,
        private colorsService: ColorsService,
        private datasetInitializerService: DatasetInitializerService,
        private inSituDataService: InSituDataService,
        private latisService: LatisService,
        private mgitmDataService: MgitmDataService
    ) {
        this.createViewer();
    }

    /**
     * ngOnInit()
     * On initialization, the app subscribes to the values of the current date range,
     * the selected datasets, the selected color palettes, selected reference frame, and formation reload.
     * When any of these values change, this component will select the correct procedure to
     * reset the viewer, as to reduce loading times if only minimal changes
     * need to be made.
     */
    ngOnInit() {
        this.dateRangeSubscription = this.latisService.getSelectedDateRange$().subscribe( () => {
            if ( this.selectedDates !== this.latisService.currentDates ) {
                this.selectedDates = this.latisService.currentDates;
                this.dateChange();
            }
        });

        this.selectedDatasetsSubscription = this.datasetInitializerService.getSelectedDatasets$().subscribe( () => {
            if ( this.stored1dParamCopy !== this.datasetInitializerService.stored1dParam ||
                    this.stored3dParamCopy !== this.datasetInitializerService.stored3dParam ) {
                this.stored1dParamCopy = this.datasetInitializerService.stored1dParam;
                this.stored3dParamCopy = this.datasetInitializerService.stored3dParam;
                this.controlsDataChange();
            }
        });

        this.selectedColorsSubscription = this.colorsService.getSelectedColors$().subscribe( () => {
            if ( this.stored1dColorCopy !== this.colorsService.stored1dColor ||
                    this.stored3dColorCopy !== this.colorsService.stored3dColor ) {
                this.stored1dColorCopy = this.colorsService.stored1dColor;
                this.stored3dColorCopy = this.colorsService.stored3dColor;
                this.controlsDataChange();
            }
            if ( this.storedMgitmColorCopy !== this.colorsService.storedMgitmColor ) {
                this.storedMgitmColorCopy = this.colorsService.storedMgitmColor;
                this.mgitmDataChange();
            }
        });

        this.referenceFrameSubscription = this.inSituDataService.getReferenceFrame$().subscribe( () => {
            if ( this.referenceFrameCopy !== this.inSituDataService.referenceFrame ) {
                this.controlsDataChange();
            }
        });

        // We don't need any of the data the service sends, just knowing when the data changes
        this.mgitmDataSubscription = this.mgitmDataService.getSelectedData$().subscribe( () => {
            this.mgitmDataChange();
        });
    }

    ngOnDestroy() {
        this.dateRangeSubscription.unsubscribe();
        this.selectedDatasetsSubscription.unsubscribe();
        this.selectedColorsSubscription.unsubscribe();
        this.referenceFrameSubscription.unsubscribe();
        this.mgitmDataSubscription.unsubscribe();
        this.viewer.destroy();
    }

    /**
     * createViewers()
     * Used to initialize the main Cesium viewer.
     * Creates a new globe using the Bing Maps API to avoid the
     * "Upgrade for commercial use" warning base Cesium Ion uses
     */
    createViewer() {
        const startTime = Cesium.JulianDate.fromDate( this.selectedDates.start );
        const stopTime = Cesium.JulianDate.fromDate( this.selectedDates.end );
        const clockViewModel = new Cesium.ClockViewModel( new Cesium.Clock( {
            startTime:  startTime,
            stopTime: stopTime,
            currentTime: startTime,
            clockRange: Cesium.ClockRange.LOOP_STOP,
            multiplier: 1500
        }));

        const viewer = new Cesium.Viewer('cesium-container', {
            mapProjection: new Cesium.GeographicProjection( MAVEN_CONSTANTS.MARSIAU2000 ),
            clockViewModel: clockViewModel,
            fullscreenButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            imageryProviderViewModels: imageryViewModels,
            selectedImageryProviderViewModel: imageryViewModels[0],
            terrainProviderViewModels: terrainViewModels,
            selectedTerrainProviderViewModel: terrainViewModels[0],
            sceneModePicker: false,
            selectionIndicator: false,
            navigationHelpButton: false,
            navigationInstructionsInitiallyVisible: false,
            scene3dOnly: true,
            shouldAnimate: true
        });
        // Calling the actual entity before destroying it prevents errors of destroying from a nonexistent scene
        viewer.scene.sun = viewer.scene.sun && viewer.scene.sun.destroy();
        viewer.scene.sun = undefined;
        viewer.scene.moon = viewer.scene.moon && viewer.scene.moon.destroy();
        viewer.scene.moon = undefined;
        viewer.scene.fog.enabled = false;
        this.inSituDataService.viewer = viewer;
        this.viewer = viewer;

        // Fixes a bug where a black square surrounds the planet and inhibits rendering
        viewer.scene.globe.depthTestAgainstTerrain = true;

        // This camera position is arbitrary, it simply contains everything we need in view
        this.viewer.camera.flyTo( {
            destination: new Cesium.Cartesian3.fromDegrees( 0, 0, 25000000, MAVEN_CONSTANTS.MARSIAU2000 )
        });
        const timeInterval = new Cesium.TimeInterval({
            start: startTime,
            stop: stopTime
        });
        this.createInertialReferenceFrame( viewer, timeInterval );
        if ( this.mgitmDataService.parameterSelected !== '' ) {
            this.loadMgitm = true;
        }
        this.loadSpacecraft = true;
        this.loadSun = true;
    }

    /**
     * createInertialReferenceFrame()
     * Used to set a newly created cesium viewer's reference frame to inertial.
     * Cesium's default creates the viewer in a planetary reference frame,
     * so this function rotates the camera on a newly computed matrix to simulate
     * an inertial reference frame.
     */
    createInertialReferenceFrame( viewer, timeInterval ) {
        if ( this.inSituDataService.referenceFrame === 'inertial' ) {
            const loadIcrf = Cesium.Transforms.preloadIcrfFixed( timeInterval );
            loadIcrf.then(() => {
                viewer.scene.postUpdate.addEventListener( function() {
                    if ( viewer.scene.mode !== Cesium.SceneMode.SCENE3D ) {
                        return;
                    }
                    const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix( viewer.clock.currentTime );
                    if ( Cesium.defined( icrfToFixed ) ) {
                        const camera = viewer.camera;
                        const offset = Cesium.Cartesian3.clone( camera.position );
                        const transform = Cesium.Matrix4.fromRotationTranslation( icrfToFixed );
                        camera.lookAtTransform( transform, offset );
                    }
                });
            });
        }
    }

    /**
     * dateChange()
     * This function is called when the selected date range is changed.
     * It destroys the viewer and resets the <spacecraft-entity> component
     * as to reload all the spacecraft data in the new viewer
     */
    dateChange() {
        this.loadMgitm = false;
        this.loadSpacecraft = false;
        this.loadSun = false;
        this.viewer.destroy();
        this.changeDetector.detectChanges();
        this.createViewer();
    }

    /**
     * controlsDataChange()
     * This function is called when either 1D or 3D parameter is changed,
     * or the selected reference frame is changed.
     *
     * We could potentially store these reloads in separate functions,
     * however since both parameters and reference changes are controlled through
     * the same reload button, we don't want multiple reloads/destructions of the viewer
     * after one call, so we're currently using this method.
     */
    controlsDataChange() {
        this.loadSpacecraft = false;
        this.changeDetector.detectChanges();
        if ( this.referenceFrameCopy !== this.inSituDataService.referenceFrame ) {
            this.loadMgitm = false;
            this.loadSun = false;
            this.changeDetector.detectChanges();
            this.viewer.destroy();
            this.referenceFrameCopy = this.inSituDataService.referenceFrame;
            this.createViewer();
        } else {
            this.loadSpacecraft = true;
            this.changeDetector.detectChanges();
        }
    }

    /**
     * mgitmDataChange()
     * Called when any of the M-GITM parameters are changed.
     * Since changing these parameters doesn't affect any other part of our Cesium entities,
     * we just need to reload the <mgitm-shell> component
     */
    mgitmDataChange() {
        this.loadMgitm = false;
        this.changeDetector.detectChanges();
        if ( this.mgitmDataService.parameterSelected !== '' ) {
            this.loadMgitm = true;
        }
    }
}
