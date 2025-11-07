import React, { useState } from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, TextInput, Button, CloseButton } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";
import useFile from "../../../store/useFile";
import styled from "styled-components";

const ModalContent = styled.div`
  background: ${({ theme }) => theme.BACKGROUND_SECONDARY};
  border-radius: 4px;
  width: 100%;
`;

const ContentHeader = styled.div`
  padding: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.BACKGROUND_TERTIARY};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderTitle = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.INTERACTIVE_NORMAL};
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button<{ $variant?: 'save' | 'cancel' }>`
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: ${({ $variant }) => 
    $variant === 'save' ? '#2ecc71' :
    $variant === 'cancel' ? '#e74c3c' :
    '#36393f'};
  color: white;
  
  &:hover {
    background: ${({ $variant }) => 
    $variant === 'save' ? '#27ae60' :
    $variant === 'cancel' ? '#c0392b' :
    '#40444b'};
  }
`;

const InputContainer = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InputLabel = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.INTERACTIVE_NORMAL};
  margin-bottom: 4px;
  text-transform: lowercase;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 8px;
  background: ${({ theme }) => theme.BACKGROUND_TERTIARY};
  border: 1px solid ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
  border-radius: 4px;
  color: ${({ theme }) => theme.INTERACTIVE_NORMAL};
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.INTERACTIVE_ACTIVE};
  }
`;

const PathContainer = styled.div`
  padding: 12px;
  border-top: 1px solid ${({ theme }) => theme.BACKGROUND_TERTIARY};
`;

const Path = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.INTERACTIVE_NORMAL};
  font-family: "Fira Code", monospace;
`;

// return object from json removing array and object fields
const parseValue = (value: string, type: string): any => {
  if (type === "number") {
    const num = Number(value);
    if (!isNaN(num)) return num;
  }
  else if (type === "boolean") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  else if (value.toLowerCase() === "null") {
    return null;
  }
  return value;
};

const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const setSelectedNode = useGraph(state => state.setSelectedNode);
  const { getJson, setJson } = useJson();
  const setContents = useFile(state => state.setContents);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const handleEdit = () => {
    // Initialize edit values from the node's data
    const initialValues: Record<string, string> = {};
    nodeData?.text.forEach(item => {
      if (typeof item.value !== "object") {
        initialValues[item.key || 'value'] = String(item.value);
      }
    });
    setEditValues(initialValues);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!nodeData?.path) return;
    
    try {
      const currentJson = JSON.parse(getJson());
      let current = currentJson;
      
      // Navigate to parent object
      for (let i = 0; i < nodeData.path.length - 1; i++) {
        current = current[nodeData.path[i]];
      }
      
      const lastKey = nodeData.path[nodeData.path.length - 1];
      const target = current[lastKey];

      const nodePath = nodeData.path;
      
      // Update only editable fields while preserving others
      Object.entries(editValues).forEach(([key, value]) => {
        if (key === 'value') {
          // Handle direct value nodes (like array elements)
          const originalType = typeof nodeData?.text[0].value;
          let parsedValue: any = value;
          
          if (originalType === "number") {
            const num = Number(value);
            if (!isNaN(num)) parsedValue = num;
          }
          else if (originalType === "boolean") {
            parsedValue = value.toLowerCase() === "true";
          }
          else if (nodeData?.text[0].value === null && value.toLowerCase() === "null") {
            parsedValue = null;
          }
          
          current[lastKey] = parsedValue;
        } else {
          // Handle object fields
          if (typeof target === "object" && target !== null) {
            // Check node type and apply appropriate restrictions
            if (nodePath?.[0] === "fruits" && !nodePath?.includes("details") && !nodePath?.includes("nutrients")) {
              if (!["name", "color"].includes(key)) {
                return; // For fruit nodes, only allow name and color
              }
            }
            if (nodePath?.includes("details")) {
              if (!["type", "season"].includes(key)) {
                return; // For details nodes, only allow type and season
              }
            }
            if (nodePath?.includes("nutrients")) {
              if (!["calories", "fiber", "vitaminC", "potassium"].includes(key)) {
                return; // For nutrients nodes, allow calories, fiber, and either vitaminC or potassium
              }
            }
            
            const field = nodeData?.text.find(t => t.key === key);
            if (field) {
              let parsedValue: any = value;
              const originalType = typeof field.value;
              
              // Special handling for nutrients values
              if (nodePath?.includes("nutrients")) {
                if (key === "calories") {
                  // Handle calories as a number
                  const num = Number(value);
                  if (!isNaN(num)) parsedValue = num;
                }
                else if (key === "fiber" || key === "vitaminC" || key === "potassium") {
                  // Handle value with or without units
                  if (value.trim() === "") {
                    parsedValue = value; // Allow empty value
                  } else if (value.match(/^[\d.]+[a-zA-Z]*$/)) {
                    // Value matches number optionally followed by unit(s)
                    parsedValue = value;
                  } else {
                    // Try to parse as number
                    const numericPart = parseFloat(value);
                    if (!isNaN(numericPart)) {
                      parsedValue = String(numericPart); // Store as pure number if no unit
                    } else {
                      parsedValue = value; // Keep as is if not parseable
                    }
                  }
                }
              } else {
                // Normal value parsing for other fields
                if (originalType === "number") {
                  const num = Number(value);
                  if (!isNaN(num)) parsedValue = num;
                }
                else if (originalType === "boolean") {
                  parsedValue = value.toLowerCase() === "true";
                }
                else if (field.value === null && value.toLowerCase() === "null") {
                  parsedValue = null;
                }
              }
              
              // Preserve the existing object structure
              if (target[key] !== undefined) {
                target[key] = parsedValue;
              }
            }
          }
        }
      });

      const newJson = JSON.stringify(currentJson, null, 2);
      
      // Update both graph and editor
      setJson(newJson);
      
      // Also update the file contents to keep the text editor in sync
      setContents({ contents: newJson });
      
      // Update the selected node's text to reflect changes
      if (nodeData) {
        const updatedNode = {
          ...nodeData,
          text: nodeData.text.map(item => {
            if (item.key && editValues[item.key]) {
              return {
                ...item,
                value: parseValue(editValues[item.key], typeof item.value)
              };
            }
            if (!item.key && editValues['value']) {
              return {
                ...item,
                value: parseValue(editValues['value'], typeof item.value)
              };
            }
            return item;
          })
        };
        setSelectedNode(updatedNode);
      }
      
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update JSON:", err);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValues({});
  };

  const canEdit = nodeData?.text.some(item => typeof item.value !== "object" || item.value === null);

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Flex gap="xs">
              {canEdit && !isEditing && (
                <Button size="xs" variant="light" onClick={handleEdit}>
                  Edit
                </Button>
              )}
              {!isEditing && <CloseButton onClick={onClose} />}
            </Flex>
          </Flex>
          {isEditing ? (
            <Stack>
              {nodeData?.text.map((item, index) => {
                // For each node type, only show editable fields
                const nodePath = nodeData.path;
                
                // For fruit nodes, only show name and color
                if (nodePath?.[0] === "fruits" && !nodePath?.includes("details") && !nodePath?.includes("nutrients")) {
                  if (item.key && !["name", "color"].includes(item.key)) {
                    return null;
                  }
                }
                
                // For details nodes, show type and season
                if (nodePath?.includes("details")) {
                  if (item.key && !["type", "season"].includes(item.key)) {
                    return null;
                  }
                }
                
                // For nutrients nodes, show calories, fiber, and either vitaminC or potassium
                if (nodePath?.includes("nutrients")) {
                  if (item.key && !["calories", "fiber", "vitaminC", "potassium"].includes(item.key)) {
                    return null;
                  }
                }
                
                // Skip object/array values
                if (typeof item.value === "object" && item.value !== null) {
                  return null;
                }
                
                const fieldKey = item.key || 'value';
                return (
                  <TextInput
                    key={index}
                    label={fieldKey}
                    value={editValues[fieldKey] || ''}
                    onChange={(e) => setEditValues(prev => ({
                      ...prev,
                      [fieldKey]: e.target.value
                    }))}
                    placeholder={`Enter ${fieldKey}`}
                  />
                );
              })}
              <Flex justify="flex-end" gap="xs">
                <Button size="xs" variant="subtle" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="xs" color="blue" onClick={handleSave}>
                  Save
                </Button>
              </Flex>
            </Stack>
          ) : (
            <ScrollArea.Autosize mah={250} maw={600}>
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            </ScrollArea.Autosize>
          )}
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
