import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import * as moment from 'moment';
import { Cacheable } from 'ngx-cacheable';
import { Observable, Subject } from 'rxjs';
import { IRange } from 'scicharts';

import { environment } from '../../../environments/environment';
import { IDateInfo, IInSituData } from '../../models/index';

/**
 * <latis> service:
 * All LaTiS HTTP requests and URL's are handled through this service
 * The selected date range can also be changed through this service.
 * Both the LaTiS requests and date-range are handled through the same
 * service due to a circular dependency on one another.
 */
@Injectable({
    providedIn: 'root'
})
export class LatisService {

    initMoment = moment( '01/06/2019', 'DD/MM/YYYY' ).utc().startOf( 'day' );
    initDate = this.initMoment.format( 'yyyy-MM-dd' );
    availableDates: IDateInfo = { start: '', end: '' };
    currentDates: IRange = {
        start: this.initMoment.toDate(),
        end: this.initMoment.add( 1, 'days' ).toDate()
    };
    selectedDates: Subject<IRange> = new Subject<IRange>();
    selectedDates$ = this.selectedDates.asObservable();
    selectInitialized = false;

    selectedMoments = {
        start: moment( this.currentDates.start ).add( 1, 'days' ).format( 'YYYY-MM-DD' ),
        end: moment( this.currentDates.end ).add( 1, 'days' ).format( 'YYYY-MM-DD' )
    };

    constructor( private http: HttpClient ) {}

    /**
     * get()
     * Shorthand function for http.get() function
     */
    @Cacheable()
    get( url: string ) {
        return this.http.get( url );
    }

    /**
     * getUrl()
     * Converts given parameters to a proper LaTiS url with the HTTP base
     * defined in the current environment file being used
     *
     * Make sure the LATIS_BASE in your environment file corresponds
     * to your correct project URL
     */
    getUrl( dataset: string, suffix: string, projection: string, operations: string[] ): string {
        const temp = environment.LATIS_BASE + dataset + '.' + suffix + '?' + projection + '&' + operations.join( '&' );
        return temp;
    }

    /**
     * setAvailableDateRange()
     * Used to find and set the available date range for LaTiS reqeusts.
     * This range is displayed in the control panel
     */
    setAvailableDateRange() {
        const firstUrl = this.getUrl(
            'in_situ_kp_data', 'jsond', 'timetag', [ 'first()' ] );
        this.get( firstUrl ).subscribe(( data: IInSituData ) => {
            const firstSeconds = data.in_situ_kp_data.data[0];
            this.availableDates.start = firstSeconds[0].toString();
        });
        const lastUrl = this.getUrl(
            'in_situ_kp_data', 'jsond', 'timetag', [ 'last()' ] );
        this.get( lastUrl ).subscribe(( data: IInSituData ) => {
            const lastSeconds = data.in_situ_kp_data.data[0];
            this.availableDates.end = lastSeconds[0].toString();
            this.setAvailableDateRangeHelper( this.currentDates.start );
        });
        return this.availableDates;
    }

    /**
     * setAvailableDateRangeHelper()
     * Used to call selectDates() after finding the available date range,
     * this needs to be called in order for Cesium to load the proper date
     * on startup
     */
    setAvailableDateRangeHelper( startDate ) {
        if ( !this.selectInitialized ) {
            const date = moment( startDate ).toDate();
            this.selectDates( date );
        }
    }

    /**
     * selectDates()
     * Takes a date as a parameter and converts it to a moment range
     * to be used for formatting dataset calls
     */
    selectDates( dateSelected: Date ) {
        const tempDate = moment( dateSelected ).utc();
        const startOfDay = tempDate.startOf( 'day' ).toDate();
        const nextDay = tempDate.add( 1, 'days' ).toDate();
        this.currentDates = {
            start: startOfDay,
            end: nextDay
        };
        this.selectedDates.next( {
            start: startOfDay,
            end: nextDay
        });
    }

    /**
     * getSelectedDateRange()
     * Observable for detecting when the date range selected changes
     */
    getSelectedDateRange$(): Observable<IDateInfo> {
        return this.selectedDates$;
    }
}

