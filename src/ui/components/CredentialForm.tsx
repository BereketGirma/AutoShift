import React, { useState } from "react";
import { Box, Button, TextField, Typography, Container } from "@mui/material";

function CredentialForm() {
    const [starID, setStarID] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<{ starID?: string, password?: string}>({});
    const newErrors: {starID?: string, password?: string} = {};

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if(!starID.trim()) {
            newErrors.starID = "StarID is required."
        }

        if(!password.trim()) {
            newErrors.password = "Password is required."
        }

        if(Object.keys(newErrors).length > 0){
            setError(newErrors)
            return
        }
        setError({});
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
                    onChange={(e) => {setStarID(e.target.value); setError({}); }}
                    error={Boolean(error.starID)}
                    helperText={error.starID}
                />

                <TextField
                    label="Password *"
                    variant="outlined"
                    value={password}
                    type="password"
                    onChange={(e) => { setPassword(e.target.value); setError({}); }}
                    error={Boolean(error.password)}
                    helperText={error.password}
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