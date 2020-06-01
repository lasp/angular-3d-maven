import { Injectable } from '@angular/core';

import { Observable, Subject } from 'rxjs';
import { IDataset } from 'scicharts';

import { MAVEN_CONSTANTS } from '../../models/index';
import { LatisService } from '../latis/latis.service';

/**
 * <dataset-initializer> service:
 * Many different components and services rely on this service for checking what
 * datasets are currently selected, but also for changes with miscellaneous variables.
 * This service also formats data from the mmsDatasets constant (found in app/models)
 * for use by different components and services.
 */
@Injectable({
    providedIn: 'root'
})
export class DatasetInitializerService {

    viewerReady: Subject<boolean> = new Subject<boolean>();
    viewerReady$ = this.viewerReady.asObservable();

    plotList: IDataset[] = [];
    overplotList: IDataset[] = [];
    selectedPlotList: [ IDataset[] ] = [ this.overplotList ];
    displayedPlots: Subject<[ IDataset[] ]> = new Subject<[ IDataset[] ]>();
    displayedPlots$ = this.displayedPlots.asObservable();

    showPlotButton = false;
    displayPlotButton: Subject<boolean> = new Subject<boolean>();
    displayPlotButton$ = this.displayPlotButton.asObservable();

    // Sets values to initial selection on control panel
    stored1dParam = '';
    stored3dParam = '';

    constructor( private latisService: LatisService ) {
        this.getAllDatasets();
    }

    /**
     * getAllDatasets()
     * This function runs on creation and should format your dataset constants
     * in the 'constants.ts' file. You should create (for each of your respective datasets)
     * a pre-made LaTiS url to add time restrictions to later, a name to reference
     * what dataset is being used, and a short description for clarity. Most of these
     * can be pre-defined in the constants file itself.
     */
    getAllDatasets() {
        this.plotList = [];
        MAVEN_CONSTANTS.ORBIT_COLOR_PARAMETERS.forEach( orbitColorParameter => {
            this.plotList.push( {
                url: this.latisService.getUrl( 'in_situ_kp_ngims', 'jsond', 'time,' + orbitColorParameter.id, [] ),
                name: orbitColorParameter.name,
                desc: orbitColorParameter.desc
            });
        });
        MAVEN_CONSTANTS.ORBIT_WHISKER_PARAMETERS.forEach( orbitWhiskerParameter => {
            this.plotList.push(
                {
                    url: this.latisService.getUrl(
                        orbitWhiskerParameter.dataset,
                        'jsond',
                        'time,'
                        + orbitWhiskerParameter.id + '_x,'
                            + orbitWhiskerParameter.id + '_y,'
                                + orbitWhiskerParameter.id + '_z',
                        []
                    ),
                    name: orbitWhiskerParameter.name,
                    desc: orbitWhiskerParameter.desc
                },
                {
                    url: this.latisService.getUrl(
                        orbitWhiskerParameter.dataset,
                        'jsond',
                        'time,' + orbitWhiskerParameter.id + '_y',
                        []
                    ),
                    name: orbitWhiskerParameter.name,
                    desc: orbitWhiskerParameter.desc
                },
                {
                    url: this.latisService.getUrl(
                        orbitWhiskerParameter.dataset,
                        'jsond',
                        'time,' + orbitWhiskerParameter.id + '_z',
                        []
                    ),
                    name: orbitWhiskerParameter.name,
                    desc: orbitWhiskerParameter.desc
                }
            );
        });
    }

    /**
     * reloadDatasets()
     * This is mainly used by the <scicharts> component for re-requesting
     * data post the selected date range changing
     */
    reloadDatasets() {
        this.setSelectedDatasets( this.stored1dParam, this.stored3dParam );
    }

    /**
     * setSelectedDatasets()
     * Using the dataset names selected from the control panel,
     * a new plot list is created containing all selected datasets and each
     * of their respective, formated data from the getAllDatasets() function
     */
    setSelectedDatasets( param1d: string, param3d: string ) {
        this.stored1dParam = param1d;
        this.stored3dParam = param3d;
        this.overplotList = [];
        this.selectedPlotList = [ this.overplotList ];
        this.plotList.forEach( plot => {
            if ( plot.name === param1d ) {
                this.selectedPlotList.push( [ plot ] );
            } else if ( plot.name === param3d ) {
                this.overplotList.push( plot );
                if ( this.overplotList.length === 3 ) {
                    this.selectedPlotList.push( this.overplotList );
                    this.overplotList = [];
                }
            }
        });
        this.selectedPlotList.shift();
        this.displayedPlots.next( this.selectedPlotList );
    }

    /**
     * getSelectedDatasets$()
     * Observable used to get new plotlist
     * Used in <scicharts> component to access current plot list
     */
    getSelectedDatasets$(): Observable<[ IDataset[] ]> {
        return this.displayedPlots$;
    }

    /**
     * getShowPlotButton$()
     * Observable for whether the "Show Plots" button should be visible
     * Used by the <app> component
     */
    getShowPlotButton$(): Observable<boolean> {
        return this.displayPlotButton$;
    }

    /**
     * getViewerReady$()
     * Observable for whether the main viewer has finished loading
     */
    getViewerReady$(): Observable<boolean> {
        return this.viewerReady$;
    }
}
