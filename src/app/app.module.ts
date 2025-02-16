import { LayoutModule } from '@angular/cdk/layout';
import { DatePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AngularSplitModule } from 'angular-split';
import { ChartModule } from 'scicharts';

import { AppComponent } from './app.component';
import { CesiumInitializerComponent } from './components/cesium-initializer/cesium-initializer.component';
import { ControlPanelComponent } from './components/control-panel/control-panel.component';
import { LegendComponent } from './components/legend/legend.component';
import { MgitmShellComponent } from './components/mgitm-shell/mgitm-shell.component';
import { ScichartsComponent } from './components/scicharts/scicharts.component';
import { SpacecraftEntitiesComponent } from './components/spacecraft-entities/spacecraft-entities.component';
import { SunEntitiesComponent } from './components/sun-entities/sun-entities.component';

@NgModule({
    declarations: [
        AppComponent,
        CesiumInitializerComponent,
        ControlPanelComponent,
        ScichartsComponent,
        SpacecraftEntitiesComponent,
        SunEntitiesComponent,
        MgitmShellComponent,
        LegendComponent
    ],
    imports: [
        AngularSplitModule.forRoot(),
        BrowserAnimationsModule,
        BrowserModule,
        ChartModule,
        FlexLayoutModule,
        FormsModule,
        HttpClientModule,
        LayoutModule,
        MatButtonModule,
        MatCheckboxModule,
        MatDatepickerModule,
        MatGridListModule,
        MatInputModule,
        MatFormFieldModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatSidenavModule,
        MatToolbarModule,
        ReactiveFormsModule
    ],
    providers: [ DatePipe ],
    bootstrap: [ AppComponent ]
})
export class AppModule { }
