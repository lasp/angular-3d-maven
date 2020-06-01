import { Injectable } from '@angular/core';

import { clone, cloneDeep } from 'lodash';
import { Observable, Subject } from 'rxjs';
import { IDataset } from 'scicharts';

import { IMgitmData, MGITM_CONSTANTS } from '../../models/index';
import { ColorsService } from '../../services/colors/colors.service';
import { InSituDataService } from '../in-situ-data/in-situ-data.service';
import { LatisService } from '../latis/latis.service';

@Injectable({
    providedIn: 'root'
})
export class MgitmDataService {

    // Stored M-GITM vals from control panel
    parameterSelected = '';
    solarFluxSelected = '130';
    solarLongitudeSelected = '';
    altitudeSelected = '98.75';
    latitudeSelected = '-87.5';
    longitudeSelected = '2.5';

    plotList: IDataset[] = [];
    selectedPlotList: [ IDataset[] ]  = [ this.plotList ];
    displayedPlots: Subject<[ IDataset[] ]> = new Subject<[ IDataset[] ]>();
    displayedPlots$ = this.displayedPlots.asObservable();

    // numerical storage of solar long
    solarLongitude: number;

    dataReady = false;
    mgitmDataReady: Subject<boolean> = new Subject<boolean>();
    mgitmDataReady$ = this.mgitmDataReady.asObservable();

    // 2d array to store colors for M-GITM shell
    pixelArray = [];

    constructor(
        private colorsService: ColorsService,
        private inSituDataService: InSituDataService,
        private latisService: LatisService
    ) {
        /**
         * Even though M-GITM data technically isn't reliant on selected dates,
         * we need to know when it changes since it is reliant on the solar longitude value,
         * which comes from the KP dataset and is dependent on the selected date.
         */
        this.latisService.getSelectedDateRange$().subscribe( () => {
            this.getMgitmData();
        });
    }

    /**
     * getMgitmData()
     * Used to reload mgitm data based on new parameter selections.
     * The data this function produces is received by scicharts to plot,
     * and cesium to display.
     */
    getMgitmData() {
        this.dataReady = false;
        this.mgitmDataReady.next( false );
        /**
         * Since scicharts needs to pass in IDataset[] wrapped in arrays,
         * this method allows us to correctly initialize a [ IDataset[] ] variable
         * and pass only the latitude and longitude plots
         */
        this.plotList = [];
        this.selectedPlotList = [ this.plotList ];
        if ( this.parameterSelected !== '' ) {
            // round to nearest MGITM solar longitude value (multiples of 90)
            const meanSolarLongitude = this.inSituDataService.solarLongitude;
            this.solarLongitude = meanSolarLongitude >= 315 || meanSolarLongitude < 45 ? 0 :
                meanSolarLongitude >= 45 && meanSolarLongitude < 135 ? 90 :
                meanSolarLongitude >= 135 && meanSolarLongitude < 225 ? 180 : 270;

            const cesiumFilters = [
                'altitude=' + this.altitudeSelected,
                'solar_flux=' + this.solarFluxSelected,
                'solar_longitude=' + this.solarLongitude.toString()
            ];
            const latitudeFilters = clone( cesiumFilters );
            latitudeFilters.push( 'Longitude=' + this.longitudeSelected );
            const longitudeFilters = clone( cesiumFilters );
            longitudeFilters.push( 'Latitude=' + this.latitudeSelected );
            const cesiumParameters = 'Latitude,Longitude,' + this.parameterSelected;
            const latitudeParameters = 'Latitude,' + this.parameterSelected;
            const longitudeParameters = 'Longitude,' + this.parameterSelected;

            // Cesium url passed to transform function to prepare the data for Cesium display
            const cesiumUrl = this.latisService.getUrl( 'mgitm', 'jsond', cesiumParameters, cesiumFilters );
            this.latisService.get( cesiumUrl ).subscribe( ( data: IMgitmData ) => {
                this.transformMgitmData( data );
            });

            // latitude and longitude URL's to be passed to the Scicharts component
            const latitudeUrl = this.latisService.getUrl( 'mgitm', 'jsond', latitudeParameters, latitudeFilters );
            const longitudeUrl = this.latisService.getUrl( 'mgitm', 'jsond', longitudeParameters, longitudeFilters );

            // Get the name of selected parameter from parameter ID
            let parameterName = '';
            for ( let i = 0; i < MGITM_CONSTANTS.PARAMETERS.length; i++ ) {
                if ( MGITM_CONSTANTS.PARAMETERS[ i ].id === this.parameterSelected ) {
                    parameterName = MGITM_CONSTANTS.PARAMETERS[ i ].name;
                    break;
                }
            }
            const latitudePlot: IDataset = {
                url: latitudeUrl,
                name: parameterName + ' vs Latitude',
                desc: 'Longitude = ' + this.longitudeSelected +
                    ', Altitude = ' + this.altitudeSelected +
                    ', Solar Flux = ' + this.solarFluxSelected
            };
            const longitudePlot: IDataset = {
                url: longitudeUrl,
                name: parameterName + ' vs Longitude',
                desc: 'Latitude = ' + this.latitudeSelected +
                    ', Altitude = ' + this.altitudeSelected +
                    ', Solar Flux = ' + this.solarFluxSelected
            };
            this.selectedPlotList.push( [ latitudePlot ] );
            this.selectedPlotList.push( [ longitudePlot ] );
        }
        this.selectedPlotList.shift();
        this.displayedPlots.next( this.selectedPlotList );
    }

    /**
     * transformMgitmData()
     * Takes M-GITM data as a parameter.
     * Index list orders as the following:
     * 0 - Latitude
     * 1 - Longitude
     * 2 - Selected Parameter ( ex: o2plus )
     */
    transformMgitmData( data: IMgitmData ) {
        const mgitmData = cloneDeep( data.mgitm.data );
        // create sets to only get distinct latitude and longitude values
        const distinctLats = new Set();
        const distinctLongs = new Set();
        // while iterating, calculate the min and max parameter data for color interpolation
        let dataMin = Number.MAX_VALUE;
        let dataMax = Number.MIN_VALUE;
        let dataVal;
        // populate distinct Latitude and Lontitude arrays
        mgitmData.forEach( row => {
            distinctLats.add( row[ 0 ] );
            distinctLongs.add( row[ 1 ] );
            dataVal = row[ 2 ];
            if ( dataVal < dataMin ) { dataMin = dataVal; }
            if ( dataVal > dataMax ) { dataMax = dataVal; }
        });

        this.pixelArray = [ ...Array( distinctLats.size ).fill( '' ) ].map( array => Array( distinctLongs.size ).fill( '' ) );

        // convert sets to arrays to get indexes
        const distinctLatsArray = Array.from( distinctLats );
        const distinctLongsArray = Array.from( distinctLongs );
        const colormap = require('colormap');
        const colors = colormap({
            colormap: this.colorsService.storedMgitmColor,
            nshades: 250,
            format: 'float'
        });
        let latIndex = -1;
        let longIndex = -1;
        mgitmData.forEach( row => {
            latIndex = distinctLatsArray.indexOf( row[ 0 ] );
            longIndex = distinctLongsArray.indexOf( row[ 1 ] );
            dataVal = row[ 2 ];

            this.pixelArray[ latIndex ][ longIndex ] = this.colorsService.interpolate(
                dataVal,
                dataMin,
                dataMax,
                colors
            );

        });
        this.dataReady = true;
        this.mgitmDataReady.next( this.dataReady );
    }

    /**
     * getMgitmSubsolarPoint()
     * This function is used by the <mgitm-shell> component to calcualte shell
     * rotation in the Cesium viewer.
     * These subsolar points do not come directly from the mgitm dataset, we have
     * to use the solar longitude values from the KP dataset to infer the mgitm
     * subsolar point.
     *
     * We are working with 4 dates provided from the comments in the .dat versions
     * of the NetCDF dataset files. These files are found in this path,
     * /maven/data/mod/umich/mgitm
     *
     * These files provide the longitude values for us, but for the latitudes we know
     * each of these dates is a solstice or equinox. The equinoxes have latitude values of 0,
     * and solstice values have +/- the axial tilt of the planet (Mar's axial tilt is 25.19 degrees)
     *
     * **NOTE** at the moment the longitude values at solar long 0 and 180 are adjusted
     * for better alignment.
     */
    getMgitmSubsolarPoint() {
        let lat;
        let lng;
        const solarLongitude = this.solarLongitude;
        if ( solarLongitude === 0 ) {
            // MGITM Results on 2002-04-17 at 20:00:00 UT.
            lat = 0;
            lng = -10;
        } else if ( solarLongitude === 90 ) {
            // MGITM Results on 2002-11-01 at 02:00:00 UT.
            lat = -25.19;
            lng = 11.75;
        } else if ( solarLongitude === 180 ) {
            // MGITM Results on 2003-05-06 at 02:00:00 UT.
            lat = 0;
            lng = -10;
        } else if ( solarLongitude === 270 ) {
            // MGITM Results on 2003-09-30 at 00:00:00 UT.
            lat = 25.19;
            lng = 8.06;
        }
        const latLngObj = {
            lat: lat,
            lng: lng
        };
        return latLngObj;
    }

    /**
     * getMgitmDataReady$()
     * Used by <mgitm-shell> component to detect when M-GITM data finishes loading
     */
    getMgitmDataReady$(): Observable<boolean> {
        return this.mgitmDataReady$;
    }

    /**
     * getSelectedData$()
     * Used by the <scicharts> component to get formatted plots to display
     */
    getSelectedData$(): Observable<[ IDataset[] ]> {
        return this.displayedPlots$;
    }
}
