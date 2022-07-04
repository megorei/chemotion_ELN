# The Chemotion frontend

This document describes design goals for the frontend code as well as the file structure of the packs folder.

*Design goals*:

- A clear hierarchy so new developers can understand the Chemotion frontend structure just by looking on the filesystem structure
- NO cross-app imports. If some code needs to be used in more than one app, this will be directly visible from the filesystem structure
- Unified import sytax using full paths. This makes it easier to move single files or whole directories around, using global search and replace for imports paths
- No unused code. Please remove ALL commented out code before committing. Same for unused imports.
- Removal of old/outdated packages (I'm looking at you alt.js and lodash!). Please use more recent language constructs where available. This will help to reduce the footprint of the javascript bundle
- Optimize code for readability: No cryptic variable names! If a thing can not be named, it is probably worth taking time to rethink the code. Don't shorten variable names (sample -> smpl), we are not writing Perl or 1980s C here...
- Optimize code for interchangeability: Code should be structured in a way that whole parts can easily be replaced or deleted.

*One word concerning naming*:

- `Components` are react components, either Class Components or Function Components (see https://reactjs.org/docs/components-and-props.html), that return a DOM Structure.
  Filenames of react components should start with an uppercase letter.
- `utility functions` are functions that are used for various purposes but DO NOT RETURN a DOM Structure.
  Filenames of utility functions should start with a lowercase letter.

Please use this differentiation when deciding where a code fragment should be saved.

## /api

This folder contains all code that is required for API communication. Currently the fetcher classes are used all around the codebase, which makes them a primary
target for refactoring them to a top layer entity. They are not components and no simple utility functions, thus they deserve their own namespace.

## /apps

The `apps` folder contains one folder per App defined in `/app/packs/entrypoints/application.js`,
meaning one folder per toplevel react tree. The app name will be represented by APP in this document.

The APP folder is supposed to house the following files and subfolders:
- APP.js which is used as the toplevel file imported in entrypoints.js (example: APP = admin -> Admin.js)
- /components/ folder: houses all React components used within this app, which are NOT shared by any other app
- /utilities/ folder (optional): utility functions used within the APP but not shared with other apps

## /entrypoints

This folder contains one file per packs. Currently this is only application.js but in the future we might split up the bundling process
to generate one bundle per app. Feasibility of that depends on the amount of shared code though, so it is not a priority at the moment.

## /shared_components

Most apps in Chemotion share a lot of React components. To prevent cross-app imports, those shared components will be placed here.
One part of the whole restructuring of `/app/packs` is to find out how much code is actually shared and whether the sharing is necessary
or can be prevented by better component design.

Subfolders should be used to create a visual hierarchy of the component tree. There is no fixed rule when to create a subfolder but
rule of thumb should be to create one if component A renders components B, C and D as children. This also allows to give the components meaningful names without
using the parent components name.

Example:

`research_plan/ResearchPlanDetailsAttachments.js` represents the attachments tab of the ResearchPlan panel.
Refactoring the component to reside under `research_plan/tabs/Attachments.js` simplifies the filename, improves discoverability via filesystem structure and allows grouping the attachments tab with all other research plan tab components.

## /shared_utilities

This folder contains shared utility functions that are used in more than one project. Please take care not to put simple one-liners here, but only sufficiently complex and properly named functions.
