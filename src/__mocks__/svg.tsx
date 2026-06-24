import React from 'react';

const SvgrMock = React.forwardRef<
  HTMLSpanElement,
  React.PropsWithChildren<{ title?: string }>
>((props, ref) => <span ref={ref} {...props} />);

SvgrMock.displayName = 'SvgrMock';

export default SvgrMock;
