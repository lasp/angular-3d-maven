import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { SplitAreaDirective, SplitComponent } from 'angular-split';
import { Subscription } from 'rxjs';
import { PlotsService } from 'scicharts';

import { DatasetInitializerService } from './services/dataset-initializer/dataset-initializer.service';
import { LatisService } from './services/latis/latis.service';
import { MgitmDataService } from './services/mgitm-data/mgitm-data.service';

/**
 * This component houses the <cesium-initializer>, <control-panel>,
 * and <scicharts> components.
 */
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: [ './app.component.scss' ]
})
export class AppComponent implements OnInit, OnDestroy {
    title = 'angular-3d-maven';

    /**
     * The 'split' initializes the split between the Cesium section of the app and the
     * Scichart section. Each respective area directive is initalized afterward.
     */
    @ViewChild( 'split', { static: true } ) split: SplitComponent;
    @ViewChild( 'cesiumViewer', { static: true } ) cesiumViewer: SplitAreaDirective;
    @ViewChild( 'scichartsViewer', { static: true } ) scichartsViewer: SplitAreaDirective;

    /**
     * direction: the split direction between the <cesium-initializer> and <scicharts> components
     * sizes: percentage of split screen showing each respective component,
     *       initialized to 60% of the split area being Cesium, and 40% Scicharts
     * visibility: booleans describing whether different components of the app are
     *       or should be visible
     */
    direction = 'horizontal';
    sizes = {
        cesiumViewer: 60,
        scichartsViewer: 40
    };
    visibility = {
        controlPanel: true,
        cesiumVis: true,
        scichartsVis: false,
        showPlotButton: false,
        loadingIcon: true
    };
    onDesktop = true;
    controlPanelStatus = 'Hide Control Panel';
    sciChartStatus = 'Show Plots';
    referenceFrame = 'inertial';

    breakPointSubscription: Subscription;
    plotButtonSubscription: Subscription;
    viewerReadySubscription: Subscription;

    constructor(
        private breakpointObserver: BreakpointObserver,
        private changeDetector: ChangeDetectorRef,
        public datasetInitializerService: DatasetInitializerService,
        private latisService: LatisService,
        private mgitmDataService: MgitmDataService,
        private plotsService: PlotsService
    ) {}

    /**
     * ngOnInit()
     * This function determines whether the app is in mobile or desktop view,
     * as well as changing the visibility booleans of the loading icons and
     * scichart button through observable subscriptions to the <dataset-initializer> service.
     */
    ngOnInit() {
        this.datasetInitializerService.viewerReady.next( false );

        this.latisService.setAvailableDateRange();

        this.breakpointObserver.observe( [ Breakpoints.Small, Breakpoints.HandsetPortrait ] )
            .subscribe( ( state: BreakpointState ) => {
                if ( state.matches ) {
                    this.onDesktop = false;
                } else {
                    this.onDesktop = true;
                }
            });
        if ( !this.onDesktop ) {
            this.visibility.controlPanel = false;
        }

        this.datasetInitializerService.getShowPlotButton$().subscribe( showPlotBool => {
            this.visibility.showPlotButton = showPlotBool;
            if ( !this.visibility.showPlotButton ) {
                this.visibility.scichartsVis = false;
            }
        });

        this.datasetInitializerService.getViewerReady$().subscribe( viewerReady => {
            this.visibility.loadingIcon = !viewerReady;
            this.changeDetector.detectChanges();
        });
    }

    ngOnDestroy() {
        this.breakPointSubscription.unsubscribe();
        this.plotButtonSubscription.unsubscribe();
        this.viewerReadySubscription.unsubscribe();
    }

    /**
     * dragEnd()
     * The sizes global variable is updated to the current size value (percentage)
     * of each of the split area directives. The Scichart plots are also reflowed
     * to adjust for the change in split size.
     */
    dragEnd( { sizes } ) {
        this.sizes.cesiumViewer = sizes[0];
        this.sizes.scichartsViewer = sizes[1];
        this.plotsService.reflowPlots();
    }

    /**
     * plotButtonControl()
     * Helper function to plotButtonHit()
     * Determines the visibility of the <scicharts> component.
     */
    plotButtonControl() {
        if ( this.visibility.showPlotButton ) {
            this.visibility.scichartsVis = !this.visibility.scichartsVis;
            if ( this.onDesktop ) {
                this.sciChartStatus = this.visibility.scichartsVis ?
                    'Hide Plots' :
                    'Show Plots';
            } else {
                this.visibility.cesiumVis = !this.visibility.cesiumVis;
            }
            this.plotsService.reflowPlots();
        } else {
            this.visibility.scichartsVis = false;
        }
    }

    /**
     * plotButtonHit()
     * Function called when the Scichart button is hit.
     * Handles whether the visibility of the "Show Plots" button
     */
    plotButtonHit() {
        const showButton = this.datasetInitializerService.stored1dParam !== '' ||
            this.datasetInitializerService.stored3dParam !== '' ||
            this.mgitmDataService.parameterSelected !== '';
        this.datasetInitializerService.displayPlotButton.next( showButton );
        if ( showButton && this.visibility.scichartsVis ) {
            this.plotButtonControl();
        }
        this.plotButtonControl();
    }

    /**
     * panelButtonControl()
     * Function called when the panel button is hit.
     * Determines the visibility of the control panel
     */
    panelButtonControl() {
        this.visibility.controlPanel = !this.visibility.controlPanel;
        this.controlPanelStatus = this.visibility.controlPanel ?
            'Hide Control Panel' :
            'Show Control Panel';
        this.plotsService.reflowPlots();
    }
}
