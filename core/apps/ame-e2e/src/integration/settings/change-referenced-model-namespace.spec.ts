/*
 * Copyright (c) 2023 Robert Bosch Manufacturing Solutions GmbH
 *
 * See the AUTHORS file(s) distributed with this work for
 * additional information regarding authorship.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * SPDX-License-Identifier: MPL-2.0
 */

/// <reference types="Cypress" />

import {
  BUTTON_renameModelConfirm,
  FIELD_renameModelInput,
  SELECTOR_dialogStartButton,
  SELECTOR_tbDeleteButton,
} from '../../support/constants';
import {cyHelp} from '../../support/helpers';
import Chainable = Cypress.Chainable;
import {RdfModel} from '@ame/rdf/utils';

/**
 * Take into consideration that these tests do not use real backend and verify
 * only the behaviour of a client-side part in isolation, backend responses are mocked
 */

describe('Test modifying referenced model', () => {
  it('Moves referenced model from different namespace to a new one, migrates dependent models', () => {
    const sharedModelExpectationFile =
      'apps/ame-e2e/src/fixtures/workspaces/referenced-models-different-namespaces/parsed-models/shared-model-changed-namespace/aspect-shared-different-namespaces.json';
    const dependentModelExpectationFile =
      'apps/ame-e2e/src/fixtures/workspaces/referenced-models-different-namespaces/parsed-models/shared-model-changed-namespace/aspect-dependent-different-namespaces.json';
    const newNamespaceName = 'newNamespace';
    const newNamespaceVersion = '1.0.0';
    const newNamespace = `${newNamespaceName}:${newNamespaceVersion}`;
    const newUrn = `urn:samm:${newNamespace}`;
    const namespacesConfig = {
      shared: {
        name: 'different.namespace:1.0.0',
        files: [
          {
            name: 'AspectSharedDifferentNamespaces.ttl',
            response: {fixture: '/workspaces/referenced-models-different-namespaces/aspect-shared-different-namespaces.txt'},
          },
        ],
      },
      dependent: {
        name: 'org.eclipse.digitaltwin:1.0.0',
        files: [
          {
            name: 'AspectDependentDifferentNamespaces.ttl',
            response: {fixture: '/workspaces/referenced-models-different-namespaces/aspect-dependent-different-namespaces.txt'},
          },
        ],
      },
    };

    setUpStaticInterceptors();
    setUpDynamicInterceptors(namespacesConfig);

    cy.visitDefault();
    cy.fixture(namespacesConfig.shared.files[0].response.fixture)
      .then(rdfString => cyHelp.loadCustomModel(rdfString))
      .then(() => cy.get(SELECTOR_dialogStartButton).click().wait(1000))
      .then(() => cy.getAspect())
      .then(() => {
        cyHelp.updateNamespace(newNamespaceName, newNamespaceVersion);
        cyHelp.saveCurrentModelToWorkspace();
        cy.get('button').contains('Continue').click();
      })
      .then(() => awaitFormatModelRequest(`@prefix ext-namespace: <${newUrn}#>`))
      .then(({body}) => {
        // Update interceptors to return the most recent value
        namespacesConfig.dependent.files[0].response = body;
        setUpDynamicInterceptors(namespacesConfig);
      })
      .then(() => awaitFormatModelRequest(`@prefix : <${newUrn}#>`))
      .then(({body}) => {
        // Update interceptors to return the most recent value
        namespacesConfig.shared.files[0].response = body;
        namespacesConfig.shared.name = newNamespace;
        setUpDynamicInterceptors(namespacesConfig);
      })
      .then(() => {
        // Trigger namespaces update in order to get the latest stubbed values from interceptors
        cyHelp.saveCurrentModelToWorkspace();
        cy.get('button').contains('Overwrite').click();
        cyHelp.loadModelFromWorkspace(namespacesConfig.dependent.name, namespacesConfig.dependent.files[0].name);
        return cy.getAspect();
      })
      .then(expected => {
        cy.readFile(dependentModelExpectationFile).then(expectation =>
          expect(JSON.stringify(expected)).to.equal(JSON.stringify(expectation))
        );
      })
      .then(() => {
        cyHelp.loadModelFromWorkspace(namespacesConfig.shared.name, namespacesConfig.shared.files[0].name);
        return cy.getAspect();
      })
      .then(expected =>
        cy.readFile(sharedModelExpectationFile).then(expectation => expect(JSON.stringify(expected)).to.equal(JSON.stringify(expectation)))
      );
  });

  it('Moves referenced model from the same namespace to a new one, migrates dependent models', () => {
    const sharedModelExpectationFile =
      'apps/ame-e2e/src/fixtures/workspaces/referenced-models-same-namespace/parsed-models/shared-model-changed-namespace/aspect-shared-same-namespaces.json';
    const dependentModelExpectationFile =
      'apps/ame-e2e/src/fixtures/workspaces/referenced-models-same-namespace/parsed-models/shared-model-changed-namespace/aspect-dependent-same-namespaces.json';
    const newNamespaceName = 'newNamespace';
    const newNamespaceVersion = '1.0.0';
    const newNamespace = `${newNamespaceName}:${newNamespaceVersion}`;
    const newUrn = `urn:samm:${newNamespace}`;
    const namespacesConfig = {
      same: {
        name: 'same.namespace:1.0.0',
        files: [
          {
            name: 'AspectSharedSameNamespace.ttl',
            response: {fixture: '/workspaces/referenced-models-same-namespace/aspect-shared-same-namespace.txt'},
          },
          {
            name: 'AspectDependentSameNamespace.ttl',
            response: {fixture: '/workspaces/referenced-models-same-namespace/aspect-dependent-same-namespace.txt'},
          },
        ],
      },
    };

    setUpStaticInterceptors();
    setUpDynamicInterceptors(namespacesConfig);

    cy.visitDefault();
    cy.fixture(namespacesConfig.same.files[0].response.fixture)
      .then(rdfString => cyHelp.loadCustomModel(rdfString))
      .then(() => cy.get(SELECTOR_dialogStartButton).click().wait(1000))
      .then(() => cy.getAspect())
      .then(() => {
        cyHelp.updateNamespace(newNamespaceName, newNamespaceVersion);
        cyHelp.saveCurrentModelToWorkspace();
        cy.get('button').contains('Continue').click();
      })
      .then(() => awaitFormatModelRequest(`@prefix ext-namespace: <${newUrn}#>`))
      .then(({body}) => {
        // Update interceptors to return the most recent value
        namespacesConfig.same.files[1].response = body;
        setUpDynamicInterceptors(namespacesConfig);
      })
      .then(() => awaitFormatModelRequest(`@prefix : <${newUrn}#>`))
      .then(({body}) => {
        // Update interceptors to return the most recent value
        namespacesConfig[newNamespaceName] = {
          name: `${newNamespaceName}:${newNamespaceVersion}`,
          files: [
            {
              name: 'AspectSharedSameNamespace.ttl',
              response: body,
            },
          ],
        };
        namespacesConfig.same.files = [namespacesConfig.same.files[1]];
        setUpDynamicInterceptors(namespacesConfig);
      })
      .then(() => {
        // Trigger namespaces update in order to get the latest stubbed values from interceptors
        cyHelp.saveCurrentModelToWorkspace();
        cy.get('button').contains('Overwrite').click();
        cyHelp.loadModelFromWorkspace(namespacesConfig.same.name, namespacesConfig.same.files[0].name);
        return cy.getAspect();
      })
      .then(expected => {
        cy.readFile(dependentModelExpectationFile).then(expectation =>
          expect(JSON.stringify(expected)).to.equal(JSON.stringify(expectation))
        );
      })
      .then(() => {
        cyHelp.loadModelFromWorkspace(namespacesConfig[newNamespaceName].name, namespacesConfig[newNamespaceName].files[0].name);
        return cy.getAspect();
      })
      .then(expected =>
        cy.readFile(sharedModelExpectationFile).then(expectation => expect(JSON.stringify(expected)).to.equal(JSON.stringify(expectation)))
      );
  });

  it('Moves shared model to a different namespace', () => {
    const sharedModelName = 'SHARED';
    const sharedModelFileName = `${sharedModelName}.ttl`;
    const namespacesConfig = {
      main: {
        name: 'org.eclipse.digitaltwin:1.0.0',
        files: [
          {
            name: 'AspectDefault.ttl',
            response: {},
          },
        ],
      },
    };

    setUpStaticInterceptors();
    setUpDynamicInterceptors(namespacesConfig);

    cy.visitDefault();
    cy.startModelling()
      .then(() => cy.getAspect())
      .then(({body}) => {
        namespacesConfig.main.files[0].response = body;
        setUpDynamicInterceptors(namespacesConfig);
      })
      .then(() => {
        cyHelp.saveCurrentModelToWorkspace();
        cy.get('button').contains('Overwrite').click();
      })
      .then(() => awaitFormatModelRequest(''))
      .then(({body}) => {
        // Update interceptors to return the most recent value
        namespacesConfig.main.files[0].response = body;
        setUpDynamicInterceptors(namespacesConfig);
      })
      .then(() => cy.dbClickShape('AspectDefault'))
      .then(() => cy.get(SELECTOR_tbDeleteButton).click())
      .then(() => cy.get(FIELD_renameModelInput).type(sharedModelName))
      .then(() => cy.get(BUTTON_renameModelConfirm).click().wait(500))
      .then(() => cyHelp.saveCurrentModelToWorkspace())
      .then(() => awaitFormatModelRequest(''))
      .then(({body}) => {
        // Update interceptors to return the most recent value
        namespacesConfig.main.files[0].name = sharedModelFileName;
        namespacesConfig.main.files[0].response = body;
        setUpDynamicInterceptors(namespacesConfig);
      })
      .then(() => {
        // Trigger namespaces update in order to get the latest stubbed values from interceptors
        cyHelp.saveCurrentModelToWorkspace();
        cy.get('button').contains('Overwrite').click();
        return cy.window().then(win => win['angular.modelService'].getLoadedAspectModel());
      })
      .then(model => {
        const rdfModel: RdfModel = model.rdfModel;
        expect(rdfModel.hasAspect).to.equal(false);
      });
  });
});

function setUpStaticInterceptors(): void {
  cy.intercept('POST', 'http://localhost:9091/ame/api/models/validate', {fixture: 'model-validation-response.json'});
  cy.intercept('POST', 'http://localhost:9091/ame/api/models/format', {}).as('formatModel');
  cy.intercept('POST', 'http://localhost:9091/ame/api/models', {});
  cy.intercept('DELETE', 'http://localhost:9091/ame/api/models', {});
}

function setUpDynamicInterceptors(namespacesConfig: any): void {
  const values: any[] = Object.values(namespacesConfig);

  // Set up namespaces structure to return
  cy.intercept(
    'GET',
    'http://localhost:9091/ame/api/models/namespaces?shouldRefresh=true',
    values.reduce(
      (acc, value) => ({
        ...acc,
        [value.name]: value.files.map(f => f.name),
      }),
      {}
    )
  );

  // Set up files content to return
  values.forEach(value => {
    value.files.forEach(file => {
      cy.intercept(
        {
          method: 'GET',
          url: 'http://localhost:9091/ame/api/models',
          headers: {namespace: value.name, 'file-name': file.name},
        },
        file.response
      );
    });
  });
}

function awaitFormatModelRequest(toInclude: string): Chainable {
  return cy.wait('@formatModel').then(({request}) => {
    cy.wrap(request.body).should('include', toInclude);
    return cy.wrap(request);
  });
}
