# Angular-3D-Maven

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 7.3.8.

### Contacts

* **Product Owner:**
	Fernando Sanchez
* **Experienced Devs:**
    * Fernando Sanchez
    * Devin Noth
    * Jenny Knuth

## Angular-3D-Maven Summary

Angular-3D-Maven is an implementation of the base LASP 3D application for the MAVEN mission. It displays a 3D rendering of Mars with the MAVEN Spacecraft orbiting it. Users can choose from different datasets to plot as well as load visualizations of the data in the viewer itself. This data is usually collected by MAVEN itself, but also can be generated by scientific models and other sources.

## Local Development

Run `npm start` for a local server. Navigate to `http://localhost:4200/`.

There are two environment files, one used for running a local server and one for a production server. 

**IMPORTANT:** The developer is responsible for obtaining one of the three pieces of the environment file on their own. This is the Cesium Ion Token. Instructions for obtaining one can be found below.

### Obtaining a Cesium Ion Token

1. Navigate to [https://cesium.com/ion/](https://cesium.com/ion/) and sign up for a free account.

2. Click on the *Access Tokens* tab on the Cesium Ion homepage, then select *Create Token*.

3. Select a name for your new token and choose the scopes or restrictions to place on that token. Note, these are not too significant to running the application. For reference, we used the ```assets:read``` and ```geocode``` scopes for the development token.

4. After creating your token, click on your new token and copy and paste the value under *Token* into the ```CESIUM_KEY``` string in your environment files. You do **NOT** need multiple keys for each environment file.
 

The LATIS_BASE constant in `environments/environment.ts` will determine which latis catalog you will hit with the local development branch to get all the needed metadata.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
