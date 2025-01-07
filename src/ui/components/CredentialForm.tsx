import React, { useState } from "react";
import { Box, Button, TextField, Typography, Container } from "@mui/material";
import { useSnackbar } from "./SnackbarProvider";

interface CredentialFormProps {
    onNavigate: () => void;
}

function CredentialForm({onNavigate}: CredentialFormProps) {
    const [starID, setStarID] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<boolean>(false);

    const { enqueueSnackbar } = useSnackbar();

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if(!starID.trim() || !password.trim()) {
            enqueueSnackbar("StarID and Password are required.", "error")
            setError(true)
            return
        }
        onNavigate()
        setError(false);
        await window.electron.invoke('run-script')   
    }

    return (
        <Container
            component="form"
            onSubmit={handleFormSubmit}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap:2,
            }}
        >
            <Box sx={{ gap:1 }}>
                <Typography variant="h5" color="textPrimary">
                    Enter Your Credentials
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    Your credentials will not be saved.
                </Typography>
            </Box>
            
            <Box sx={{display:"flex", gap:2, justifyContent:'center'}}>
                <TextField
                    label="StarID *"
                    variant="outlined"
                    value={starID}
                    onChange={(e) => {setStarID(e.target.value); setError(false); }}
                    error={error}
                />

                <TextField
                    label="Password *"
                    variant="outlined"
                    value={password}
                    type="password"
                    onChange={(e) => { setPassword(e.target.value); setError(false); }}
                    error={error}
                />
            </Box>     

            <Button
                type="submit"
                variant="contained"
                color="primary"
                sx={{marginTop: 2, position:'relative'}}
            >
                Run Script
            </Button>
        </Container>
    )
}

export default CredentialForm;