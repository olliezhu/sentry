import React from 'react';

import {mountWithTheme} from 'sentry-test/enzyme';
import {initializeOrg} from 'sentry-test/initializeOrg';

import TicketRuleModal from 'app/views/settings/projectAlerts/issueRuleEditor/ticketRuleModal';

jest.unmock('app/utils/recreateRoute');
jest.mock('app/actionCreators/onboardingTasks');

describe('ProjectAlerts -> TicketRuleModal', function () {
  const closeModal = jest.fn();
  const modalElements = {
    Header: p => p.children,
    Body: p => p.children,
    Footer: p => p.children,
  };

  afterEach(function () {
    closeModal.mockReset();
    MockApiClient.clearMockResponses();
  });

  // TODO take params
  const createWrapper = (props = {}) => {
    const {organization, routerContext} = initializeOrg(props);
    const updateParentMock = jest.fn();

    const node = {};
    const data = {
      integration: 1,
    };

    return mountWithTheme(
      <TicketRuleModal
        {...modalElements}
        closeModal={closeModal}
        formFields={node.formFields || {}}
        link=""
        ticketType=""
        instance={data}
        index={0}
        onSubmitAction={updateParentMock}
        organization={organization}
      />,
      routerContext
    );
  };

  describe('Create Rule', function () {
    let mock;
    const endpoint = '/organizations/org-slug/integrations/1/';
    beforeEach(async function () {
      mock = MockApiClient.addMockResponse({
        url: endpoint,
        method: 'GET',
        body: {
          createIssueConfig: [
            {
              name: 'project',
              label: 'Jira Project',
              choices: [['10000', 'TEST']],
              default: '10000',
              type: 'select',
              updatesForm: true,
            },
            {
              name: 'issuetype',
              label: 'Issue Type',
              default: '10001',
              type: 'select',
              choices: [
                ['10001', 'Improvement'],
                ['10002', 'Task'],
                ['10003', 'Sub-task'],
                ['10004', 'New Feature'],
                ['10005', 'Bug'],
                ['10000', 'Epic'],
              ],
              updatesForm: true,
              required: true,
            },
            {
              label: 'Reporter',
              required: true,
              // url: '/extensions/jira/search/sentry/1/',
              choices: [['a', 'a']],
              type: 'select',
              name: 'reporter',
            },
          ],
        },
      });
    });

    it('should render the Ticket Rule modal', async function () {
      const wrapper = createWrapper();
      expect(mock).toHaveBeenCalled();

      expect(wrapper.find('Button[data-test-id="form-submit"]').text()).toEqual(
        'Apply Changes'
      );

      const formFields = wrapper.find('FormField');
      expect(formFields.at(0).text()).toEqual('Title');
      expect(formFields.at(1).text()).toEqual('Description');
    });

    it('should save the modal data when "Apply Changes" is clicked', async function () {
      const wrapper = createWrapper();

      wrapper.find('input#reporter').simulate('change', {target: {value: 'a'}});

      wrapper.find('Button[data-test-id="form-submit"]').simulate('submit');

      expect(wrapper.find('FieldErrorReason')).toHaveLength(0);
      expect(closeModal).toHaveBeenCalled();
    });

    it('should raise validation errors when "Apply Changes" is clicked', async function () {
      // This doesn't test anything TicketRules specific but I'm leaving it here as an example.
      const wrapper = createWrapper();
      wrapper.find('Button[data-test-id="form-submit"]').simulate('submit');

      const errors = wrapper.find('FieldErrorReason');
      expect(errors).toHaveLength(1);
      expect(errors.first().text()).toEqual('Field is required');
      expect(closeModal).toHaveBeenCalledTimes(0);
    });

    it('should reload fields when an "updatesForm" field changes', async function () {
      const wrapper = createWrapper();
      // Set something
      // Capture choices
      // Update issuetype
      // See that the value is different
      // Choices are different
    });
  });
});
