import { Component, OnDestroy, OnInit } from '@angular/core';

import { clone } from 'lodash';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { DEFAULT_UI_OPTIONS, IDataset, IRange, IUIFeatures } from 'scicharts';

import { IPlotItem } from '../../models';
import { DatasetInitializerService } from '../../services/dataset-initializer/dataset-initializer.service';
import { LatisService } from '../../services/latis/latis.service';
import { MgitmDataService } from '../../services/mgitm-data/mgitm-data.service';

/**
 * <scicharts> component:
 * Formats the selected datasets and time range to be plotted by the
 * <sci-charts> module in the html file.
 *
 * This component is housed in the <app> component
 */
@Component({
    selector: 'app-scicharts',
    templateUrl: './scicharts.component.html',
    styleUrls: [ './scicharts.component.scss' ]
})
export class ScichartsComponent implements OnInit, OnDestroy {

    range: IRange = {
        start: moment.utc( this.latisService.currentDates.start ).format( 'YYYY-MM-DD' ),
        end: moment.utc( this.latisService.currentDates.end ).format( 'YYYY-MM-DD' )
    };
    /**
     * Since we don't need a range restriction for the mgitm data
     * we use all available data range for those calls.
     * Initialized to hardcoded available data dates.
     */
    fullRange: IRange = {
        start: '2014-03-17',
        end: '2019-08-15'
    };
    plotList: IPlotItem[] = [ {
        datasets: [],
        id: '',
        range: this.range
    } ];
    // Only possible to have 4 plots displayed in this app at a time, so these are all our Id options
    idOptions = [ '1', '2', '3', '4' ];
    controlsDisplayedIds = [];
    mgitmDisplayedIds = [];
    allDatasets: IDataset[] = [];
    display = false;

    dateRangeSubscription: Subscription;
    datasetSubscription: Subscription;
    mgitmSubscription: Subscription;

    SCICHARTS_PRESET: IUIFeatures = {
        featureList: DEFAULT_UI_OPTIONS.features.featureList,
        toolbar: true,
        filters: false,
        metadata: true,
        download: true,
        globalSettings: false,
        overplot: true,
        limits: false,
        events: false,
        binnedData: false,
        discreteData: false,
        rangeSelector: false,
        collapsible: true,
        modifyDatasetsButton: false
    };
    uiOptions = DEFAULT_UI_OPTIONS;

    constructor(
        private datasetInitializerService: DatasetInitializerService,
        private latisService: LatisService,
        private mgitmDataService: MgitmDataService
    ) {
        this.uiOptions.features = this.SCICHARTS_PRESET;
    }

    /**
     * ngOnInit()
     * Calls for range and datasets to be initialized
     */
    ngOnInit() {
        this.rangeSelector();
        this.datasetSelector();
    }

    ngOnDestroy() {
        this.dateRangeSubscription.unsubscribe();
        this.datasetSubscription.unsubscribe();
        this.mgitmSubscription.unsubscribe();
    }

    /**
     * rangeSelector()
     * Subscribes to <latis> service date range to get values and detect changes
     */
    rangeSelector() {
        this.dateRangeSubscription = this.latisService.getSelectedDateRange$().subscribe( selectedDateRange => {
            this.range = {
                start: selectedDateRange.start,
                end: selectedDateRange.end
            };
            this.datasetInitializerService.reloadDatasets();
        });
    }

    /**
     * removePlotById()
     * Used by the datasetSelector function to remove a list of plots when new data is selected
     * from either the <mgitm-data> or <dataset-initializer> services.
     *
     * This function is needed to remove specific plots from the plotList variable. Since it's unreasonable
     * to clear the entire array and call all our subscribers again to recieve the same data, we use this
     * to only remove specific plots.
     */
    removePlotsById( ids: string[], addingPlots: boolean ) {
        ids.forEach( id => {
            this.plotList.forEach( plot => {
                if ( plot.id === id ) {
                    this.plotList.splice( this.plotList.indexOf( plot ), 1 );
                }
            });
            if ( this.mgitmDisplayedIds.includes( id ) ) {
                this.mgitmDisplayedIds.splice( this.mgitmDisplayedIds.indexOf( id ), 1 );
            } else if ( this.controlsDisplayedIds.includes( id ) ) {
                this.controlsDisplayedIds.splice( this.mgitmDisplayedIds.indexOf( id ), 1 );
            }
        });
        /**
         * If we aren't adding more plots ( aka if this is called by the dataset selector ),
         * and there are no plots to display, close the window
         */
        if ( !addingPlots && this.plotList.length === 0 ) {
            this.datasetInitializerService.displayPlotButton.next( false );
        }
    }

    /**
     * pushSelectedPlots()
     * Used for pushing plots to the plotList array, and formatting
     * passed in plots to fit the IDataset format. This function also determines
     * whether to assign a plot the 24 hour range or full data range. Mgitm data
     * uses the full range due to the minimal amount of data, and controls data
     * uses the 24 hour range.
     */
    pushSelectedPlots( selectedPlots, displayedIds, useFullRange: boolean ) {
        selectedPlots.forEach( selectedPlot => {
            for ( let i = 0; i < 4; i++ ) {
                if ( !( this.mgitmDisplayedIds.includes( this.idOptions[ i ] ) ||
                    this.controlsDisplayedIds.includes( this.idOptions[ i ] ) ) ) {
                    this.plotList.push( {
                        datasets: selectedPlot,
                        id: this.idOptions[ i ],
                        range: useFullRange ? this.fullRange : this.range
                    });
                    displayedIds.push( this.idOptions[ i ] );
                    break;
                }
            }
        });
        this.display = this.plotList.length > 0;
    }

    /**
     * datasetSelector()
     * Subscribes to plot lists in <dataset-initializer> and <mgitm-data> services.
     * Removes plots from individual service if selected data changes as to not remove
     * all datasets if only one selected option changes.
     */
    datasetSelector() {
        this.plotList = [];
        this.display = false;
        this.datasetSubscription = this.datasetInitializerService.getSelectedDatasets$().subscribe( selectedPlots => {
            // Can't use a for each to call this, since the asynchronous runs removes inconsistently, confusing indexes on the altered array
            this.removePlotsById( clone( this.controlsDisplayedIds ), true );
            this.pushSelectedPlots( selectedPlots, this.controlsDisplayedIds, false );
        });

        this.mgitmSubscription = this.mgitmDataService.getSelectedData$().subscribe( selectedPlots => {
            this.removePlotsById( clone( this.mgitmDisplayedIds ), true );
            this.pushSelectedPlots( selectedPlots, this.mgitmDisplayedIds, true );
        });
    }
}
