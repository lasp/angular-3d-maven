import { ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import * as moment from 'moment';
import { Subscription } from 'rxjs';

import { colormaps, MAVEN_CONSTANTS, MGITM_CONSTANTS } from '../../models/index';
import { ColorsService } from '../../services/colors/colors.service';
import { DatasetInitializerService } from '../../services/dataset-initializer/dataset-initializer.service';
import { InSituDataService } from '../../services/in-situ-data/in-situ-data.service';
import { LatisService } from '../../services/latis/latis.service';
import { MgitmDataService } from '../../services/mgitm-data/mgitm-data.service';


/**
 * <control-panel> component:
 * Organizes selected parameter and date options to be used by different
 * components throughout the application. Most changes are sent to separate
 * services or emitted directly to the <app> component.
 *
 * This component is housed by the <app> component
 */
@Component({
    selector: 'app-control-panel',
    templateUrl: './control-panel.component.html',
    styleUrls: [ './control-panel.component.scss' ]
})
export class ControlPanelComponent implements OnInit, OnDestroy {
    @Output() plotButtonHit = new EventEmitter<boolean>();

    /**
     * Setting the orbit parameters to pre-defined constants
     * works well for use with <mat-option>. Look at how the colorParameters
     * are implemented for example. The colorParameters.name is displayed
     * in the app, but the colorParameters.colormap is the value used in
     * the FormControl for each respective color selector. This is done
     * to tell other parts of the app the actual colormap ID rather than
     * the colormap name.
     */

    availableDates = { start: '', end: '' };

    // Bools to disable specific buttons during reloads or before changes
    buttonDisabled = {
        date: true,
        mgitm: true,
        override: false,
        viewer: true
    };

    dateDisplayed = new FormControl( moment( this.latisService.currentDates.end ) );
    dateDisplayedChecker = this.dateDisplayed.value.startOf( 'day' );

    // Form controls for In-Situ Controls <mat-select> instances in <control-panel> html
    controlsFormGroup = new FormGroup({
        referenceFrameSelected: new FormControl( this.inSituDataService.referenceFrame ),
        orbit1dSelected: new FormControl( this.datasetInitializerService.stored1dParam ),
        color1dSelected: new FormControl( this.colorsService.stored1dColor ),
        orbitWhiskerSelected: new FormControl( this.datasetInitializerService.stored3dParam ),
        color3dSelected: new FormControl( this.colorsService.stored3dColor )
    });

    orbit1dParameters = MAVEN_CONSTANTS.ORBIT_COLOR_PARAMETERS;
    orbitWhiskerParameters = MAVEN_CONSTANTS.ORBIT_WHISKER_PARAMETERS;
    colorParameters = colormaps;

    // Form Controls for M-GITM <mat-select> instances
    mgitmFormGroup = new FormGroup({
        parameterSelected: new FormControl( this.mgitmDataService.parameterSelected ),
        solarFluxSelected: new FormControl( this.mgitmDataService.solarFluxSelected ),
        altitudeSelected: new FormControl( this.mgitmDataService.altitudeSelected ),
        latitudeSelected: new FormControl( this.mgitmDataService.latitudeSelected ),
        longitudeSelected: new FormControl( this.mgitmDataService.longitudeSelected ),
        colorSelected: new FormControl( this.colorsService.storedMgitmColor )
    });

    mgitmSolarFluxes = MGITM_CONSTANTS.SOLAR_FLUXES;
    mgitmParameters = MGITM_CONSTANTS.PARAMETERS;
    // Populated in ngOnInit(), not hard coded constants due to large amount of selection options
    // and name of selection is the same string passed to LaTiS call
    mgitmAltitudes = [];
    mgitmLatitudes = [];
    mgitmLongitudes = [];

    viewerReadySubscription: Subscription;

    errorMessages: string[] = [];
    showError = false;

    constructor(
        private changeDetector: ChangeDetectorRef,
        private colorsService: ColorsService,
        private datasetInitializerService: DatasetInitializerService,
        private inSituDataService: InSituDataService,
        private latisService: LatisService,
        private mgitmDataService: MgitmDataService
    ) { }

    /**
     * ngOnInit()
     * Subscribes to the viewerReady variable in the <dataset-initializer>
     * service in order to determine when buttons should be disabled
     */
    ngOnInit() {
        this.availableDates = this.latisService.availableDates;

        this.viewerReadySubscription = this.datasetInitializerService.getViewerReady$().subscribe( viewerReady => {
            if ( viewerReady ) {
                this.buttonDisabled.override = false;
                this.enableDateChange();
                this.enableMgitm();
                this.enableViewer();
                this.changeDetector.detectChanges();
            } else {
                this.buttonDisabled.viewer = true;
                this.buttonDisabled.date = true;
                this.buttonDisabled.override = true;
            }
        });

        // Populates the M-GITM altitude options array for values 98.75 km - 251.25 km, incremented by 2.5
        this.mgitmAltitudes = this.populateRangeArray( 98.75, 251.25, 2.5 );
        // Populates the M-GITM latitude options array for values -87.5 to 87.5, incremented by 5
        this.mgitmLatitudes = this.populateRangeArray( -87.5, 87.5, 5 );
        // Populates the M-GITM longitude options array for values 2.5 to 357.5, incremented by 5
        this.mgitmLongitudes = this.populateRangeArray( 2.5, 357.5, 5 );
    }

    ngOnDestroy() {
        this.viewerReadySubscription.unsubscribe();
    }

    /**
     * Used to populate an array of strings with values using a constant increment
     * from a min value to a max value. In terms of the program, used to populate
     * the Latitude, Longitude, and Altitude options for the M-GITM data selection.
     */
    populateRangeArray( min, max, increment ): string[] {
        const ret = [];
        for ( let i = min; i <= max; i = i + increment ) {
            ret.push( i.toString() );
        }
        return ret;
    }

    /**
     * checkDateValidity()
     * Called when the date-picker Reload button is hit.
     * Checks if a newly selected date is in the available date range.
     * Sends new date to the <latis> service if valid, which then
     * will reload all date dependent components in the app
     */
    checkDateValidity() {
        this.errorMessages = [];
        this.showError = false;
        let valid = true;
        const dateDisplayedNum = ( this.dateDisplayed.value.utc().unix() * 1000 ).toString();
        if ( dateDisplayedNum < this.availableDates.start ) {
            valid = false;
            this.showError = true;
            this.errorMessages.push( 'Date cannot be before min Available Date.' );
        }
        if ( dateDisplayedNum > this.availableDates.end ) {
            valid = false;
            this.showError = true;
            this.errorMessages.push( 'Date cannot be after max Available Date.' );
        }

        if ( valid ) {
            this.latisService.selectDates( this.dateDisplayed.value );
            this.dateDisplayedChecker = this.dateDisplayed.value;
            this.buttonDisabled.date = true;
        }
    }

    /**
     * enableViewer()
     * Called when any of the <mat-select> selections change.
     * Determines whether the viewer reload button should be disabled based
     * upon whether selected parameters have been actually changed or not.
     */
    enableViewer() {
        if ( !this.buttonDisabled.override ) {
            this.buttonDisabled.viewer = (
                ( this.controlsFormGroup.controls[ 'referenceFrameSelected' ].value === this.inSituDataService.referenceFrame &&
                this.controlsFormGroup.controls[ 'orbit1dSelected' ].value === this.datasetInitializerService.stored1dParam &&
                this.controlsFormGroup.controls[ 'orbitWhiskerSelected' ].value === this.datasetInitializerService.stored3dParam ) &&
                ( this.controlsFormGroup.controls[ 'color1dSelected' ].value === this.colorsService.stored1dColor ||
                    this.controlsFormGroup.controls[ 'orbit1dSelected' ].value === '' ) &&
                ( this.controlsFormGroup.controls[ 'color3dSelected' ].value === this.colorsService.stored3dColor ||
                    this.controlsFormGroup.controls[ 'orbitWhiskerSelected' ].value === '' )
            );
        }
    }

    /**
     * enableDateChange()
     * Called when the <mat-datepicker> selected date changes.
     * Determines whether reload button should be disabled similar to enableViewer()
     */
    enableDateChange() {
        if ( !this.buttonDisabled.override ) {
            this.buttonDisabled.date = this.dateDisplayed.value.toDate().getTime() === this.dateDisplayedChecker.toDate().getTime();
        }
    }

    /**
     * displayChanges()
     * Called when viewer Reload button is hit.
     * Calls all relevant service functions and emits changes to send
     * variable changes to separate components
     */
    displayControlChanges() {
        if ( this.inSituDataService.referenceFrame !== this.controlsFormGroup.controls[ 'referenceFrameSelected' ].value ) {
            this.inSituDataService.setReferenceFrame( this.controlsFormGroup.controls[ 'referenceFrameSelected' ].value );
        }
        this.datasetInitializerService.setSelectedDatasets(
            this.controlsFormGroup.controls[ 'orbit1dSelected' ].value,
            this.controlsFormGroup.controls[ 'orbitWhiskerSelected' ].value
        );
        // for selecting new Controls colors, send active M-GITM color to keep our changes consistent
        this.colorsService.setSelectedColors(
            this.controlsFormGroup.controls[ 'color1dSelected' ].value,
            this.controlsFormGroup.controls[ 'color3dSelected' ].value,
            this.colorsService.storedMgitmColor
        );
        this.plotButtonHit.emit();
        this.buttonDisabled.viewer = true;
    }

    /**
     * enableMgitm()
     * Called whenever a selection changes on any of the mgitm data options.
     * Used to determine whether the "Apply Mgitm" button should be active or not,
     * aka if hitting the button would produce any changes.
     */
    enableMgitm() {
        if ( !this.buttonDisabled.override ) {
            this.buttonDisabled.mgitm = (
                ( this.mgitmFormGroup.controls[ 'parameterSelected' ].value === '' && this.mgitmDataService.parameterSelected === '' ) || (
                this.mgitmFormGroup.controls[ 'parameterSelected' ].value === this.mgitmDataService.parameterSelected &&
                this.mgitmFormGroup.controls[ 'solarFluxSelected' ].value === this.mgitmDataService.solarFluxSelected &&
                this.mgitmFormGroup.controls[ 'altitudeSelected' ].value === this.mgitmDataService.altitudeSelected &&
                this.mgitmFormGroup.controls[ 'latitudeSelected' ].value === this.mgitmDataService.latitudeSelected &&
                this.mgitmFormGroup.controls[ 'longitudeSelected' ].value === this.mgitmDataService.longitudeSelected &&
                this.mgitmFormGroup.controls[ 'colorSelected' ].value === this.colorsService.storedMgitmColor )
            );
        }
    }

    /**
     * displayMgitmChanges()
     * Sets all relevant service variables to those selected in the <mat-select> options.
     * Tells the rest of the app the mgitm service has been called and disables the "Apply Mgitm" button.
     */
    displayMgitmChanges() {
        this.mgitmDataService.parameterSelected = this.mgitmFormGroup.controls[ 'parameterSelected' ].value;
        this.mgitmDataService.solarFluxSelected = this.mgitmFormGroup.controls[ 'solarFluxSelected' ].value;
        this.mgitmDataService.altitudeSelected = this.mgitmFormGroup.controls[ 'altitudeSelected' ].value;
        this.mgitmDataService.latitudeSelected = this.mgitmFormGroup.controls[ 'latitudeSelected' ].value;
        this.mgitmDataService.longitudeSelected = this.mgitmFormGroup.controls[ 'longitudeSelected' ].value;
        this.colorsService.setSelectedColors(
            this.colorsService.stored1dColor,
            this.colorsService.stored3dColor,
            this.mgitmFormGroup.controls[ 'colorSelected' ].value
        );
        this.mgitmDataService.getMgitmData();
        this.plotButtonHit.emit();
        this.buttonDisabled.mgitm = true;
    }

}
