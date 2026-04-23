/**
 * SPDX-FileCopyrightText: (c) 2025 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.osb.patcher.service.impl;

import com.liferay.osb.patcher.constants.PatcherConstants;
import com.liferay.osb.patcher.constants.PatcherFixConstants;
import com.liferay.osb.patcher.constants.WorkflowConstants;
import com.liferay.osb.patcher.model.PatcherFix;
import com.liferay.osb.patcher.model.PatcherProjectVersion;
import com.liferay.osb.patcher.service.PatcherProjectVersionLocalService;
import com.liferay.osb.patcher.service.base.PatcherFixServiceBaseImpl;
import com.liferay.osb.patcher.util.PatcherUtil;
import com.liferay.portal.aop.AopService;
import com.liferay.portal.kernel.exception.PortalException;
import com.liferay.portal.kernel.json.JSONFactoryUtil;
import com.liferay.portal.kernel.json.JSONObject;
import com.liferay.portal.kernel.util.Validator;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

/**
 * @author Davi Santos
 */
@Component(
	property = {
		"json.web.service.context.name=osbpatcher",
		"json.web.service.context.path=PatcherFix"
	},
	service = AopService.class
)
public class PatcherFixServiceImpl extends PatcherFixServiceBaseImpl {

	public JSONObject checkFixesByProjectVersion(
			String patcherProjectVersionName, String ticketList)
		throws PortalException {

		_validateCheckFixesByProjectVersion(patcherProjectVersionName, ticketList);

		PatcherProjectVersion patcherProjectVersion =
			_patcherProjectVersionLocalService.fetchPatcherProjectVersionByName(
				patcherProjectVersionName);

		List<PatcherFix> patcherFixes = patcherFixLocalService.getPatcherFixes(
			patcherProjectVersion.getPatcherProjectVersionId(), true,
			PatcherFixConstants.TYPE_ANY,
			WorkflowConstants.STATUS_FIX_COMPLETE);

		Set<String> patcherFixNames = new HashSet<>();

		for (PatcherFix patcherFix : patcherFixes) {
			patcherFixNames.add(patcherFix.getName());
		}

		JSONObject jsonObject = JSONFactoryUtil.createJSONObject();

		for (String ticket : ticketList.split(",")) {
			String preparedTicket = PatcherUtil.preparePatcherName(ticket);

			jsonObject.put(
				preparedTicket, patcherFixNames.contains(preparedTicket));
		}

		return jsonObject;
	}

	private void _validateCheckFixesByProjectVersion(
			String patcherProjectVersionName, String ticketList)
		throws PortalException {

		if (Validator.isNull(patcherProjectVersionName)) {
			throw new PortalException("the-project-version-name-is-required");
		}

		PatcherProjectVersion patcherProjectVersion =
			_patcherProjectVersionLocalService.fetchPatcherProjectVersionByName(
				patcherProjectVersionName);

		if (patcherProjectVersion == null) {
			throw new PortalException("the-project-version-does-not-exist");
		}

		if (Validator.isNull(ticketList)) {
			throw new PortalException("the-ticket-list-is-required");
		}

		Pattern pattern = Pattern.compile(
			PatcherConstants.TICKET_NAME_LPD_LPE_LPS_REGEX);

		for (String ticket : ticketList.split(",")) {
			String preparedTicket = PatcherUtil.preparePatcherName(ticket);

			if (!pattern.matcher(preparedTicket).matches()) {
				throw new PortalException("the-ticket-x-is-invalid");
			}
		}
	}

	@Reference
	private PatcherProjectVersionLocalService _patcherProjectVersionLocalService;

}
