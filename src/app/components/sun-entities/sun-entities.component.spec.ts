import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SunEntitiesComponent } from './sun-entities.component';

describe('SunEntitiesComponent', () => {
    let component: SunEntitiesComponent;
    let fixture: ComponentFixture<SunEntitiesComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ SunEntitiesComponent ]
        })
    .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SunEntitiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
