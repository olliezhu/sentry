import React from 'react';
import styled from '@emotion/styled';
import {Location} from 'history';
import pick from 'lodash/pick';

import Badge from 'app/components/badge';
import Breadcrumbs from 'app/components/breadcrumbs';
import Clipboard from 'app/components/clipboard';
import * as Layout from 'app/components/layouts/thirds';
import ExternalLink from 'app/components/links/externalLink';
import ListLink from 'app/components/links/listLink';
import NavTabs from 'app/components/navTabs';
import Tooltip from 'app/components/tooltip';
import Version from 'app/components/version';
import {URL_PARAM} from 'app/constants/globalSelectionHeader';
import {IconCopy, IconOpen} from 'app/icons';
import {t} from 'app/locale';
import space from 'app/styles/space';
import {Organization, Release, ReleaseMeta, ReleaseProject} from 'app/types';
import {formatAbbreviatedNumber, formatVersion} from 'app/utils/formatters';

import ReleaseActions from './releaseActions';

type Props = {
  location: Location;
  organization: Organization;
  release: Release;
  project: Required<ReleaseProject>;
  releaseMeta: ReleaseMeta;
  refetchData: () => void;
};

const ReleaseHeader = ({
  location,
  organization,
  release,
  project,
  releaseMeta,
  refetchData,
}: Props) => {
  const {version, url} = release;
  const {commitCount, commitFilesChanged, releaseFileCount} = releaseMeta;

  const releasePath = `/organizations/${organization.slug}/releases/${encodeURIComponent(
    version
  )}/`;

  const tabs = [
    {title: t('Overview'), to: releasePath},
    {
      title: (
        <React.Fragment>
          {t('Commits')} <NavTabsBadge text={formatAbbreviatedNumber(commitCount)} />
        </React.Fragment>
      ),
      to: `${releasePath}commits/`,
    },
    {
      title: (
        <React.Fragment>
          {t('Files Changed')}
          <NavTabsBadge text={formatAbbreviatedNumber(commitFilesChanged)} />
        </React.Fragment>
      ),
      to: `${releasePath}files-changed/`,
    },
    {
      title: (
        <React.Fragment>
          {t('Artifacts')}
          <NavTabsBadge text={formatAbbreviatedNumber(releaseFileCount)} />
        </React.Fragment>
      ),
      to: `${releasePath}artifacts/`,
    },
  ];

  const getCurrentTabUrl = (path: string) => ({
    pathname: path,
    query: pick(location.query, Object.values(URL_PARAM)),
  });

  return (
    <StyledHeader>
      <HeaderInfoContainer>
        <Breadcrumbs
          crumbs={[
            {
              to: `/organizations/${organization.slug}/releases/`,
              label: t('Releases'),
              preserveGlobalSelection: true,
            },
            {label: formatVersion(version)},
          ]}
        />

        <ReleaseActions
          orgSlug={organization.slug}
          projectSlug={project.slug}
          release={release}
          releaseMeta={releaseMeta}
          refetchData={refetchData}
        />
      </HeaderInfoContainer>

      <Layout.HeaderContent>
        <ReleaseName>
          <Version version={version} anchor={false} />

          <IconWrapper>
            <Clipboard value={version}>
              <Tooltip title={version} containerDisplayMode="flex">
                <IconCopy size="xs" />
              </Tooltip>
            </Clipboard>
          </IconWrapper>

          {!!url && (
            <IconWrapper>
              <Tooltip title={url}>
                <ExternalLink href={url}>
                  <IconOpen size="xs" />
                </ExternalLink>
              </Tooltip>
            </IconWrapper>
          )}
        </ReleaseName>
      </Layout.HeaderContent>

      <StyledNavTabs>
        {tabs.map(tab => (
          <ListLink
            key={tab.to}
            to={getCurrentTabUrl(tab.to)}
            isActive={() => tab.to === location.pathname}
          >
            {tab.title}
          </ListLink>
        ))}
      </StyledNavTabs>
    </StyledHeader>
  );
};

const StyledHeader = styled(Layout.Header)`
  flex-direction: column;
`;

const HeaderInfoContainer = styled('div')`
  margin-bottom: ${space(1)};
  @media (min-width: ${p => p.theme.breakpoints[1]}) {
    display: grid;
    grid-column-gap: ${space(3)};
    grid-template-columns: 1fr max-content;
    margin-bottom: 0;
  }
`;

const ReleaseName = styled('div')`
  font-size: ${p => p.theme.headerFontSize};
  color: ${p => p.theme.textColor};
  display: flex;
  align-items: center;
`;

const IconWrapper = styled('span')`
  transition: color 0.3s ease-in-out;
  margin-left: ${space(1)};

  &,
  a {
    color: ${p => p.theme.gray300};
    display: flex;
    &:hover {
      cursor: pointer;
      color: ${p => p.theme.textColor};
    }
  }
`;

const StyledNavTabs = styled(NavTabs)`
  margin-bottom: 0;
  grid-column: 1 / 2;
`;

const NavTabsBadge = styled(Badge)`
  @media (max-width: ${p => p.theme.breakpoints[0]}) {
    display: none;
  }
`;

export default ReleaseHeader;
