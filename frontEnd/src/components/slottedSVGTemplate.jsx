import { SlottedSVG } from "@ukic/react";

function SlottedSVGTemplate({ mdiIcon }) {
  return (
    <>
      <SlottedSVG slot="icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000">
        <path d={mdiIcon}></path>
      </SlottedSVG>
    </>
  );
}

export default SlottedSVGTemplate;
