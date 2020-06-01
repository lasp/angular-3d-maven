import { Component, OnDestroy, OnInit } from '@angular/core';

import { cloneDeep } from 'lodash';
import { Subscription } from 'rxjs';

import { InSituDataService } from '../../services/in-situ-data/in-situ-data.service';

/**
 * <sun-entities> component
 * Used to add the Sun entites into the main Cesium viewer,
 * as well as control the lighitng display on the mars model.
 *
 * This component is housed by the <cesium-initializer> component
 */
@Component({
    selector: 'app-sun-entities',
    templateUrl: './sun-entities.component.html',
    styleUrls: [ './sun-entities.component.scss' ]
})
export class SunEntitiesComponent implements OnInit, OnDestroy {

    viewer;
    subSolarEntity = new Cesium.Entity();
    sunEntity = new Cesium.Entity();
    displaySubSolarEntity = true;

    dataReadySubscription: Subscription;
    showSubSolarPointSubscription: Subscription;

    constructor(
        private inSituDataService: InSituDataService
    ) { }

    /**
     * ngOnInit()
     * Sets the viewer to the viewer currently initialized by the
     * <cesium-initializer> component
     */
    ngOnInit() {
        this.viewer = this.inSituDataService.viewer;
        this.initializeSolarData();
    }

    /**
     * ngOnDestroy()
     * Upon destruction of the component, the component will
     * unsubscribe from any rxjs subscriptions and remove
     * any remaining entities if the viewer has not been destroyed.
     * Must check to make sure all these exist before removing/unsubscribing
     * or else we will be met with errors.
     */
    ngOnDestroy() {
        if ( this.dataReadySubscription ) {
            this.dataReadySubscription.unsubscribe();
        }
        if ( !this.viewer.isDestroyed() ) {
            if ( this.viewer.entities.contains( this.subSolarEntity ) ) {
                this.viewer.entities.remove( this.subSolarEntity );
            }
            if ( this.viewer.entities.contains( this.sunEntity ) ) {
                this.viewer.entities.remove( this.sunEntity );
            }
        }
        if ( this.showSubSolarPointSubscription ) {
            this.showSubSolarPointSubscription.unsubscribe();
        }
    }

    /**
     * initializeSolarData()
     * Uses the kpDataReady observable to test whether the data has been transformed
     * and the sun entities can be loaded into the main viewer.
     */
    initializeSolarData() {
        if ( this.inSituDataService.kpReadyBool ) {
            this.reloadData();
            this.addSubSolarPoint();
        } else {
            this.dataReadySubscription = this.inSituDataService.getKpDataReady$().subscribe( ( val ) => {
                if ( val ) {
                    this.reloadData();
                    this.addSubSolarPoint();
                    this.dataReadySubscription.unsubscribe();
                }
            });
        }
    }

    /**
     * addSubSolarPoint()
     * Since there is an option to remove the subsolar point in the legend
     * it needs its own add and removal function to reload itself without having to
     * reload the entire component.
     * This function subscribes to a value in the <in-situ-data> service that determines
     * whether the point should be shown or not.
     */
    addSubSolarPoint() {
        this.showSubSolarPointSubscription = this.inSituDataService.getShowSubSolarPoint$().subscribe( ( val ) => {
            if ( val ) {
                if ( !this.viewer.isDestroyed() ) {
                    this.subSolarEntity = this.viewer.entities.add( new Cesium.Entity( {
                        position: this.inSituDataService.subSolarPositions,
                        billboard: {
                            image: './assets/images/Sun.png',
                            scale: 0.2
                        }
                    }));
                }
            } else {
                if ( this.viewer.entities.contains( this.subSolarEntity ) && !this.viewer.isDestroyed()) {
                    this.viewer.entities.remove( this.subSolarEntity );
                }
            }
        });
    }

    /**
     * reloadData()
     * Adds the sun entities to the cesium viewer if the viewer is currently not destroyed
     * Updates lighting based on the current position of the sun entitiy
     */
    reloadData() {
        if ( !this.viewer.isDestroyed() ) {
            this.sunEntity = this.viewer.entities.add( new Cesium.Entity( {
                position: this.inSituDataService.solarPositions,
                billboard: {
                    image: './assets/images/testSun.png',
                    scale: 4
                }
            }));

            this.viewer.scene.globe.enableLighting = true;
            this.viewer.scene.globe.showGroundAtmosphere = false;
            const clock = this.viewer.clock;
            const julianDates = cloneDeep( this.inSituDataService.julianDates );
            let index = 0;
            // Use equalsEpsilon to check equal dates since clock.currentTime is a very precise value
            this.viewer.scene.postRender.addEventListener( () => {
                if ( clock.currentTime.equalsEpsilon( clock.startTime, 7200 ) ) {
                    index = 0;
                }
                /**
                 * For some reason, Cesium likes to display light on the opposite side of
                 * the hemisphere of the direction you give it. So we've created a data array
                 * keeping track of the opposite side of the hemisphere of the sun to display the light
                 * on that side in order to light the correct side of the planet.
                 * This is kind of a hack and we might be able to improve this through a simple calculation
                 * of the already created data.
                 */
                for ( let i = index; i < this.inSituDataService.julianDates.length; i++ ) {
                    if ( julianDates[ i ].equalsEpsilon( clock.currentTime, 3600 ) ) {
                        this.viewer.scene.light = new Cesium.DirectionalLight( {
                            direction: this.inSituDataService.subSolarOpposHemisPositions.getValue( julianDates[ i ] )
                        });
                        break;
                    } else {
                        index = index + 1;
                    }
                }
            });
        }
    }
}
