import React from 'react';
import styled from '@emotion/styled';

import {t} from 'app/locale';
import space from 'app/styles/space';

type Props = {
  type: 'symbolication' | 'stack-unwinding';
  icon: React.ReactElement | null;
};

function Stacktrace({icon, type}: Props) {
  const label = type === 'symbolication' ? t('Symbolication') : t('Stack unwinding');
  return (
    <Wrapper>
      {icon}
      {label}
    </Wrapper>
  );
}

export default Stacktrace;

const Wrapper = styled('div')`
  display: grid;
  grid-template-columns: repeat(2, max-content);
  grid-gap: ${space(0.75)};
  align-items: center;
`;
