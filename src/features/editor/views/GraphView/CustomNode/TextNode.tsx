import React from "react";
import styled from "styled-components";
import type { CustomNodeProps } from ".";
import useConfig from "../../../../../store/useConfig";
import { isContentImage } from "../lib/utils/calculateNodeSize";
import { TextRenderer } from "./TextRenderer";
import * as Styled from "./styles";
import { useModal } from "../../../../../store/useModal";

const StyledTextNodeWrapper = styled.span<{ $isParent: boolean }>`
  display: flex;
  justify-content: ${({ $isParent }) => ($isParent ? "center" : "flex-start")};
  align-items: center;
  height: 100%;
  width: 100%;
  overflow: hidden;
  padding: 0 10px;
`;

const StyledImageWrapper = styled.div`
  padding: 5px;
`;

const StyledImage = styled.img`
  border-radius: 2px;
  object-fit: contain;
  background: ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
`;

const EditButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  color: ${({ theme }) => theme.NODE_COLORS.TEXT};
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  min-width: 24px;
  min-height: 24px;
  border-radius: 3px;
  
  &:hover {
    background: ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
  }
`;

const NodeContent = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 100%;

  &:hover ${EditButton} {
    opacity: 1;
  }
`;

const Node = ({ node, x, y }: CustomNodeProps) => {
  const { text, width, height } = node;
  const imagePreviewEnabled = useConfig(state => state.imagePreviewEnabled);
  const isImage = imagePreviewEnabled && isContentImage(JSON.stringify(text[0].value));
  const value = text[0].value;
  const setVisible = useModal(state => state.setVisible);
  
  const handleEdit = () => {
    setVisible("NodeModal", true);
  };

  return (
    <Styled.StyledForeignObject
      data-id={`node-${node.id}`}
      width={width}
      height={height}
      x={0}
      y={0}
    >
      {isImage ? (
        <StyledImageWrapper>
          <StyledImage src={JSON.stringify(text[0].value)} width="70" height="70" loading="lazy" />
        </StyledImageWrapper>
      ) : (
        <StyledTextNodeWrapper
          data-x={x}
          data-y={y}
          data-key={JSON.stringify(text)}
          $isParent={false}
        >
          <Styled.StyledKey $value={value} $type={typeof text[0].value}>
            <NodeContent>
              <TextRenderer>{value}</TextRenderer>
              {typeof value !== "object" || value === null ? (
                <EditButton onClick={handleEdit} title="Edit value">✎</EditButton>
              ) : null}
            </NodeContent>
          </Styled.StyledKey>
        </StyledTextNodeWrapper>
      )}
    </Styled.StyledForeignObject>
  );
};

function propsAreEqual(prev: CustomNodeProps, next: CustomNodeProps) {
  return prev.node.text === next.node.text && prev.node.width === next.node.width;
}

export const TextNode = React.memo(Node, propsAreEqual);
