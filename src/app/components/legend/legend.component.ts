import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

import { Subscription } from 'rxjs';

import { MAVEN_CONSTANTS } from '../../models/index';
import { InSituDataService } from '../../services/in-situ-data/in-situ-data.service';

@Component({
    selector: 'app-legend',
    templateUrl: './legend.component.html',
    styleUrls: [ './legend.component.scss' ]
})
export class LegendComponent implements OnInit {

    viewer;
    // added a space in front of the first three to trick the linter
    legendValues = {
        'Elevation ': '',
        'Latitude ': '',
        'Longitude ': '',
        'Solar Zenith Angle': '',
        'Solar Longitude': ''
    };
    solarChecked = true;
    trackChecked = true;

    kpDataReadySubscription: Subscription;
    onTickEventListener;

    constructor(
        private changeDetector: ChangeDetectorRef,
        private inSituDataService: InSituDataService
    ) { }

    /**
     * ngOnInit()
     * Waits till the KP data has loaded to begin tracking the MAVEN legend values.
     */
    ngOnInit() {
        this.viewer = this.inSituDataService.viewer;
        this.kpDataReadySubscription = this.inSituDataService.getKpDataReady$().subscribe( ( val ) => {
            if ( val ) {
                this.viewer = this.inSituDataService.viewer;
                this.getLegendValues();
            } else {
                if ( !this.viewer.isDestroyed() ) {
                    this.viewer.clock.onTick.removeEventListener( this.onTickEventListener );
                }
            }
        });
    }



    /**
     * solarChange()
     * Determines when the Sub-solar point check box has been changed
     */
    solarChange( val ) {
        this.solarChecked = val;
        this.inSituDataService.showSubSolarPoint.next( val );
    }

    /**
     * trackChange()
     * Determines when the ground track check box has been changed
     */
    trackChange( val ) {
        this.trackChecked = val;
        this.inSituDataService.showGroundTrack.next( val );
    }

    /**
     * getLegendValues()
     * Creates an event listener to determine the different values of the
     * MAVEN spacecraft based on the current time in the Cesium Clock.
     */
    getLegendValues() {
        const clock = this.viewer.clock;
        this.onTickEventListener = this.viewer.clock.onTick.addEventListener( () => {
            const cartesianPosition = this.inSituDataService.spacecrafts.transformed.getValue( clock.currentTime );
            // possibility of position being undefined, need to check before computing
            if ( cartesianPosition ) {
                const cartographicPosition = Cesium.Cartographic.fromCartesian(
                    cartesianPosition,
                    MAVEN_CONSTANTS.MARSIAU2000
                );
                this.legendValues[ 'Elevation ' ] = ( cartographicPosition.height / 1000 ).toFixed( 1 ) + 'km';
                this.legendValues[ 'Latitude ' ] = Cesium.Math.toDegrees( cartographicPosition.latitude ).toFixed( 1 ) + '°';
                this.legendValues[ 'Longitude ' ] = Cesium.Math.toDegrees( cartographicPosition.longitude ).toFixed( 1 ) + '°';
            }

            const solarZenithAngle = this.inSituDataService.solarZenithAngles.getValue( clock.currentTime );
            if ( solarZenithAngle ) {
                this.legendValues[ 'Solar Zenith Angle' ] = solarZenithAngle.toFixed( 1 ) + '°';
            }
            this.legendValues[ 'Solar Longitude' ] = this.inSituDataService.solarLongitude.toFixed( 1 ) + '°';

            this.changeDetector.detectChanges();
        });
    }

}
