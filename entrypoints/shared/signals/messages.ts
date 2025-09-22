export type ContentToBackgroundMessage =
  | {
      type: 'PAGE_CONTEXT';
      payload: {
        title?: string;
        heading?: string;
      };
    }
  | {
      type: 'LINK_CONTEXT';
      payload: {
        linkText?: string;
        linkRel?: string | null;
      };
    };
