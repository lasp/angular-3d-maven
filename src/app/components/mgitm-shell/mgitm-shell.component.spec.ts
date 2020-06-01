import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MgitmShellComponent } from './mgitm-shell.component';

describe('MgitmShellComponent', () => {
    let component: MgitmShellComponent;
    let fixture: ComponentFixture<MgitmShellComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ MgitmShellComponent ]
        })
    .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(MgitmShellComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
