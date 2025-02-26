/**
 * SPDX-FileCopyrightText: (c) 2024 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {mergeTests, expect, Page} from '@playwright/test';

import {apiHelpersTest} from '../../fixtures/apiHelpersTest';
import {applicationsMenuPageTest} from '../../fixtures/applicationsMenuPageTest';
import {loginTest} from '../../fixtures/loginTest';
import {pageEditorPagesTest} from '../../fixtures/pageEditorPagesTest';
import {pageViewModePagesTest} from '../../fixtures/pageViewModePagesTest';
import {pagesAdminPagesTest} from '../../fixtures/pagesAdminPagesTest';
import {productMenuPageTest} from '../../fixtures/productMenuPageTest';
import {sitesPageTest} from '../../fixtures/sitesPageTest';
import {usersAndOrganizationsPagesTest} from '../../fixtures/usersAndOrganizationsPagesTest';
import {virtualInstancesPagesTest} from '../../fixtures/virtualInstancesPagesTest';
import getRandomString from '../../utils/getRandomString';

export const test = mergeTests(
	apiHelpersTest,
	applicationsMenuPageTest,
	loginTest(),
	pageEditorPagesTest,
	pageViewModePagesTest,
	pagesAdminPagesTest,
	productMenuPageTest,
	sitesPageTest,
	usersAndOrganizationsPagesTest,
	virtualInstancesPagesTest
);

test.afterAll(async ({sitesPage}) => {
	await sitesPage.goto();

	await sitesPage.deleteAll();
});

test('Ensure that the super admin can add pages, add portlets, navigate to the product menu, use the WYSIWYG editor, and view alert messages', async ({
	apiHelpers,
	applicationsMenuPage,
	page,
	pageEditorPage,
	pagesAdminPage,
	productMenuPage,
	siteConfigurationDetailsPage,
	sitesPage,
	widgetPagePage
}) => {
	let siteName: string;
	let pageNames: string[];

	await test.step('Agree to terms of use and answer reminder query', async () => {
		const user =
			await apiHelpers.headlessAdminUser.getUserAccountByEmailAddress(
				'test@liferay.com'
			);

		await apiHelpers.jsonWebServicesUser.agreeToTermsOfUse(user.id);

		await apiHelpers.jsonWebServicesUser.answerReminderQuery(user.id);

		await page.reload();
	});

	await test.step('Assert that the welcome page elements are visible', async () => {
		await expect(page.getByText('Welcome to Liferay')).toBeVisible();

		const treeImage = page.locator('img[src*="tree.png"]');
		await expect(treeImage).toBeVisible();
	});

	await test.step('Create a new site', async () => {
		await applicationsMenuPage.goToSites();

		siteName = getRandomString();

		await sitesPage.createSite({
			isCustom: false,
			siteName: siteName,
			templateName: 'Blank Site',
		});
	});

	await test.step('Assert the site configuration details', async () => {
		await siteConfigurationDetailsPage.selectMembership('Open');

		await siteConfigurationDetailsPage.saveButton.click();

		await applicationsMenuPage.goToSites();

		const row = page.getByRole('row').filter({hasText: siteName});

		const siteTableCheckbox = row.getByRole('checkbox');
		await expect(siteTableCheckbox).toBeVisible();

		const siteTableType = row.locator('[class*=membership-type]');
		await expect(siteTableType).toContainText('Open');

		const siteTableStatus = row.locator('[class*=active]');
		await expect(siteTableStatus).toContainText('Yes');

		const siteTableDropdown = row.getByLabel('Show Actions');
		await expect(siteTableDropdown).toBeVisible();
	});

	await test.step('Create three widget pages for the site', async () => {
		await applicationsMenuPage.goToSite(siteName);

		await productMenuPage.goToPages();

		await page.getByText('New', {exact: true}).click();

		pageNames = [getRandomString(), getRandomString(), getRandomString()];

		for (const pageName of pageNames) {
			await pagesAdminPage.addPage({
				name: pageName,
				template: 'Widget Page',
			});

			await page.goBack();
		}
	});

	await test.step('Add the Menu Display portlet to the first widget page', async () => {
		await page.goto(`/web/${siteName}/${pageNames[0]}`);

		await widgetPagePage.addPortlet('Menu Display');

		const portletTitle = page.getByRole('heading', {name: 'Menu Display'});
		await expect(portletTitle).toBeVisible();

		const portletBody = page
			.locator('[class*=portlet-content]')
			.filter({has: portletTitle})
			.locator('[class*=portlet-body]');

		for (const pageName of pageNames) {
			const portletBodyContent = portletBody.locator(
				`a[href*="${pageName}"]`
			);
			await expect(portletBodyContent).toBeVisible();
		}
	});

	await test.step('Add a heading fragment to the content page', async () => {
		await pagesAdminPage.goto(`/${siteName}`);

		const contentPageName = getRandomString();

		await pagesAdminPage.createNewPage({
			draft: true,
			name: contentPageName,
			template: 'Blank',
		});

		await pageEditorPage.addFragment('Basic Components', 'Heading');

		await pageEditorPage.publishPage();

		await page.goto(`/web/${siteName}/${contentPageName}`);

		const headingFragment = page.getByRole('heading', {
			name: 'Heading Example',
		});
		await expect(headingFragment).toBeVisible();
	});

	await test.step('Navigate to the product menu and access web content', async () => {
		await applicationsMenuPage.goToSite(siteName);

		await productMenuPage.openProductMenuIfClosed();

		await productMenuPage.goToWebContent();
	});

	await test.step('Assert the site administration portlet title', async () => {
		const siteAdministrationPortletTitle = page.getByRole('heading', {
			name: 'Web Content',
		});
		await expect(siteAdministrationPortletTitle).toBeVisible();
	});

	await test.step('Navigate to the second widget page and assert the toggle controls', async () => {
		await page.goto(`/web/${siteName}/${pageNames[1]}`);

		await widgetPagePage.toggleControls('hidden');

		expect(
			await widgetPagePage.toggleControlsButton
				.locator('svg')
				.evaluate((element) =>
					element.classList.contains('lexicon-icon-hidden')
				)
		).toBeTruthy();
	});
});
