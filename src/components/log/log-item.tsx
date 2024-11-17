import { styled, Box, Tooltip } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { CSSProperties } from "react";

const Item = styled(Box)(({ theme: { palette, typography } }) => ({
  padding: "8px 0",
  margin: "0 12px",
  lineHeight: 1.35,
  borderBottom: `1px solid ${palette.divider}`,
  fontSize: "0.875rem",
  fontFamily: typography.fontFamily,
  userSelect: "text",
  "& .time": {
    color: palette.text.secondary,
  },
  "& .type": {
    display: "inline-block",
    marginLeft: 8,
    textAlign: "center",
    borderRadius: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  '& .type[data-type="error"], & .type[data-type="err"]': {
    color: palette.error.main,
  },
  '& .type[data-type="warning"], & .type[data-type="warn"]': {
    color: palette.warning.main,
  },
  '& .type[data-type="info"], & .type[data-type="inf"]': {
    color: palette.info.main,
  },
  "& .data": {
    color: palette.text.primary,
    overflowWrap: "anywhere",
  },
}));

interface SourceBlockProps {
  procName?: string;
  source: string;
}

function SourceBlock(props: SourceBlockProps) {
  const { procName, source } = props;
  const boxsx = { flex: "none", minWidth: "8rem", textAlign: "end" };

  if (procName !== undefined) {
    return (
      <Tooltip title={source} placement="top">
        <Box component="span" className="procName" sx={boxsx}>
          {procName}
        </Box>
        {/* <span className="source">{source}</span> */}
      </Tooltip>
    );
  }

  return (
    <Box component="span" className="source" sx={boxsx}>
      {source}
    </Box>
  );
}

interface TargetBlockProps {
  target: string;
}

function TargetBlock(props: TargetBlockProps) {
  const { target } = props;

  function parseUrl(input: string) {
    // Add a dummy protocol if missing
    const urlString =
      input.startsWith("http://") || input.startsWith("https://")
        ? input
        : `http://${input}`;

    try {
      const url = new URL(urlString);

      const hostname = url.hostname; // Full domain or IP
      const port = url.port ? `:${url.port}` : ""; // Include colon if port exists

      // Determine if the hostname is an IP address
      const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
      if (isIpAddress) {
        return {
          subDomain: undefined,
          topDomain: hostname,
          port,
        };
      }

      // Split the hostname into parts
      const parts = hostname.split(".");
      let subDomain = "";
      let topDomain = hostname;

      if (parts.length > 2) {
        // Extract subdomain and top-level domain
        subDomain = parts.slice(0, -2).join(".") + "."; // Everything except the last two parts
        topDomain = parts.slice(-2).join("."); // Last two parts
      }

      return {
        subDomain,
        topDomain,
        port,
      };
    } catch (err) {
      console.error(`Error parsing URL: ${input}`, err);
      return undefined;
    }
  }

  const targetInfo = parseUrl(target);

  return (
    <Tooltip title={target}>
      <Box
        component="span"
        className="target"
        sx={{
          display: "inline",
          flexDirection: "row",
          flex: "1 1 auto",
          paddingRight: "2rem",

          overflow: "hidden",
          textWrap: "nowrap",
          textOverflow: "ellipsis",
          direction: "rtl",
          textAlign: "end",
        }}
      >
        {targetInfo !== undefined ? (
          <>
            {targetInfo.subDomain && (
              <Box component="span" sx={{ opacity: 0.8 }}>
                {targetInfo.subDomain}
              </Box>
            )}
            <Box component="span" sx={{ fontWeight: "bold" }}>
              {targetInfo.topDomain}
            </Box>
            <Box component="span" sx={{ opacity: 0.3 }}>
              {targetInfo.port}
            </Box>
          </>
        ) : (
          <Box component="span">{target}</Box>
        )}
      </Box>
    </Tooltip>
  );
}

interface MatchBlockProps {
  matchDetail?: string;
  match: string;
}

function MatchBlock(props: MatchBlockProps) {
  const { match, matchDetail } = props;
  if (matchDetail !== undefined) {
    return (
      <Tooltip title={match} placement="top">
        <Box
          component="span"
          className="matchDetail"
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
            flex: "1 1 auto",
            fontWeight: "bold",
          }}
        >
          {matchDetail}
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box component="span" className="source">
      {match}
    </Box>
  );
}

interface Props {
  value: ILogItem;
}

const LogItem = (props: Props) => {
  const { value } = props;
  const detail = value.detail;

  // If there is detailed info in value, use detailed layout
  if (detail !== undefined) {
    return (
      <Item>
        <div>
          <span className="time">{value.time}</span>
          <span className="type" data-type={value.type.toLowerCase()}>
            {value.type}
          </span>
        </div>
        <Box
          className="detail_data"
          sx={{
            display: "flex",
            width: "100%",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: "0.5rem",

            fontFamily: "monospace",
            textWrap: "nowrap",
            textOverflow: "ellipsis",
            overflow: "hidden",
          }}
        >
          <Box component="span" sx={{ display: "none" }} className="data">
            {JSON.stringify(detail)}
          </Box>

          {/* Connection Type */}
          <Box
            component="span"
            className="connType"
            sx={{
              flex: "none",
              borderRadius: "0.5rem",
              borderColor: "red",
              border: "1px solid",
              paddingInline: "0.5rem",
              opacity: "0.5",
              fontWeight: "bold",
            }}
          >
            {detail.connType}
          </Box>

          {/* Source and Target */}
          <Box
            component="div"
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: "0.5rem",
              width: "30rem",
              flex: "1 1 auto",
            }}
          >
            {/* Source */}
            <SourceBlock source={detail.source} procName={detail.processName} />

            {/* Arrow */}
            <ChevronRightRoundedIcon
              sx={{ opacity: 0.3 }}
            ></ChevronRightRoundedIcon>

            {/* Target */}
            <TargetBlock target={detail.target} />
          </Box>

          {/* Match  */}
          <MatchBlock match={detail.match} matchDetail={detail.matchDetail} />

          {/* Using  */}
          <Box
            component="span"
            className="using"
            sx={{
              display: "flex",
              flex: "none",
              flexDirection: "row",
              justifyContent: "flex-end",
              fontFamily: "sans-serif",
              minWidth: "20rem",
            }}
          >
            {detail.using.trim()}
          </Box>
        </Box>
      </Item>
    );
  }

  // Use basic layout
  return (
    <Item>
      <div>
        <span className="time">{value.time}</span>
        <span className="type" data-type={value.type.toLowerCase()}>
          {value.type}
        </span>
      </div>
      <div>
        <span className="data">{value.payload}</span>
      </div>
    </Item>
  );
};

export default LogItem;
