package com.example.gmailapplication.viewmodels;

import android.app.Application;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.MutableLiveData;
import com.example.gmailapplication.API.BackendClient;
import com.example.gmailapplication.API.EmailAPI;
import com.example.gmailapplication.repository.EmailRepository;
import com.example.gmailapplication.repository.LabelRepository;
import com.example.gmailapplication.shared.Email;
import com.example.gmailapplication.shared.Label;

import androidx.lifecycle.LiveData;

import java.util.ArrayList;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class InboxViewModel extends AndroidViewModel {
    private EmailRepository repository;
    private EmailAPI emailAPI;
    private LabelRepository labelRepository;
    private MutableLiveData<List<Email>> emails = new MutableLiveData<>();
    private MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private MutableLiveData<String> error = new MutableLiveData<>();

    // Support for filtering
    private MutableLiveData<String> currentFilter = new MutableLiveData<>("inbox");
    private MutableLiveData<String> currentFilterDisplayName = new MutableLiveData<>("Inbox");

    // *** Adding pagination ***
    private int currentPage = 1;
    private final int pageSize = 50;
    private List<Email> allEmails = new ArrayList<>(); // All emails from server
    private MutableLiveData<Integer> totalPages = new MutableLiveData<>(1);
    private MutableLiveData<Boolean> hasNextPage = new MutableLiveData<>(false);
    private MutableLiveData<Boolean> hasPreviousPage = new MutableLiveData<>(false);

    private MutableLiveData<List<Email>> searchResults = new MutableLiveData<>();
    private MutableLiveData<Boolean> isSearching = new MutableLiveData<>(false);
    private LiveData<List<Email>> roomEmails;

    // Add existing getters
    public MutableLiveData<List<Email>> getSearchResults() { return searchResults; }
    public MutableLiveData<Boolean> getIsSearching() { return isSearching; }

    // *** New getters for pagination ***
    public MutableLiveData<Integer> getTotalPages() { return totalPages; }
    public MutableLiveData<Boolean> getHasNextPage() { return hasNextPage; }
    public MutableLiveData<Boolean> getHasPreviousPage() { return hasPreviousPage; }
    public int getCurrentPage() { return currentPage; }

    public InboxViewModel(Application app) {
        super(app);
        repository = new EmailRepository(app);
        emailAPI = BackendClient.get(app).create(EmailAPI.class);

        roomEmails = repository.getEmailsWithRoom();
        System.out.println("=== ROOM: LiveData initialized in ViewModel ===");

        labelRepository = new LabelRepository(app);
        System.out.println("InboxViewModel: LabelRepository initialized");

        System.out.println("=== Testing Labels from Room ===");
        LiveData<List<Label>> testLabels = labelRepository.getLabelsWithRoom();
        System.out.println("=== Labels LiveData created ===");
    }

    // Existing Getters
    public MutableLiveData<List<Email>> getEmails() { return emails; }
    public MutableLiveData<Boolean> getIsLoading() { return isLoading; }
    public MutableLiveData<String> getError() { return error; }

    // Getters for filtering
    public MutableLiveData<String> getCurrentFilter() { return currentFilter; }
    public MutableLiveData<String> getCurrentFilterDisplayName() { return currentFilterDisplayName; }

    // Simple interface for handling operations
    public interface SimpleCallback {
        void onResult(boolean success);
    }

    // *** The original function - now with pagination ***
    public void loadEmails() {
        loadEmailsPage(1);
    }

    private void loadEmailsPage(int page) {
        isLoading.setValue(true);
        error.setValue(null);
        currentFilter.setValue("inbox");
        currentFilterDisplayName.setValue("Inbox");

        repository.getEmails().enqueue(new Callback<EmailAPI.EmailListResponse>() {
            @Override
            public void onResponse(Call<EmailAPI.EmailListResponse> call, Response<EmailAPI.EmailListResponse> response) {
                isLoading.setValue(false);
                System.out.println("=== INBOX RESPONSE DEBUG ===");
                System.out.println("Response successful: " + response.isSuccessful());
                if (response.isSuccessful() && response.body() != null) {
                    allEmails = response.body().inbox;
                    System.out.println("All inbox emails count: " + allEmails.size());

                    // Calculate pagination
                    updatePagination(page, allEmails);

                } else {
                    System.out.println("Response error or null body");
                    error.setValue("Error loading emails");
                }
                System.out.println("========================");
            }

            @Override
            public void onFailure(Call<EmailAPI.EmailListResponse> call, Throwable t) {
                isLoading.setValue(false);
                error.setValue("Network error");
            }
        });
    }

    // *** Helper function for calculating pagination ***
    private void updatePagination(int page, List<Email> allEmailsList) {
        int totalEmails = allEmailsList.size();
        int totalPagesCalc = (int) Math.ceil((double) totalEmails / pageSize);
        int startIndex = (page - 1) * pageSize;
        int endIndex = Math.min(startIndex + pageSize, totalEmails);

        // Cut only the emails for the current page
        List<Email> pageEmails = (startIndex < totalEmails) ?
                allEmailsList.subList(startIndex, endIndex) : new ArrayList<>();

        // Update state
        currentPage = page;
        totalPages.setValue(Math.max(1, totalPagesCalc));
        hasNextPage.setValue(page < totalPagesCalc);
        hasPreviousPage.setValue(page > 1);

        emails.setValue(pageEmails);

        System.out.println("=== PAGINATION DEBUG ===");
        System.out.println("Page: " + page + "/" + totalPagesCalc);
        System.out.println("Showing emails: " + startIndex + "-" + (endIndex-1));
        System.out.println("Page emails count: " + pageEmails.size());
        System.out.println("========================");
    }

    // *** Page navigation functions ***
    public void goToNextPage() {
        if (hasNextPage.getValue() == Boolean.TRUE) {
            loadEmailsPage(currentPage + 1);
        }
    }

    public void goToPreviousPage() {
        if (hasPreviousPage.getValue() == Boolean.TRUE) {
            loadEmailsPage(currentPage - 1);
        }
    }

    public void goToPage(int page) {
        int maxPage = totalPages.getValue() != null ? totalPages.getValue() : 1;
        if (page >= 1 && page <= maxPage) {
            loadEmailsPage(page);
        }
    }

    // Function to load emails by label - remains as is for now
    public void loadEmailsByLabel(String labelName, String displayName) {
        currentPage = 1; // Reset to first page
        isLoading.setValue(true);
        error.setValue(null);
        currentFilter.setValue(labelName);
        currentFilterDisplayName.setValue(displayName);

        System.out.println("=== LOADING EMAILS BY LABEL ===");
        System.out.println("Label: " + labelName);
        System.out.println("Display Name: " + displayName);

        repository.getEmailsByLabel(labelName).enqueue(new Callback<EmailAPI.MailsByLabelResponse>() {
            @Override
            public void onResponse(Call<EmailAPI.MailsByLabelResponse> call, Response<EmailAPI.MailsByLabelResponse> response) {
                isLoading.setValue(false);
                System.out.println("=== LABEL RESPONSE DEBUG ===");
                System.out.println("Response successful: " + response.isSuccessful());
                System.out.println("Response code: " + response.code());

                if (response.isSuccessful() && response.body() != null) {
                    List<Email> labelMails = response.body().mails;
                    System.out.println("Label emails count: " + (labelMails != null ? labelMails.size() : 0));

                    // Apply pagination to labels as well
                    if (labelMails != null) {
                        allEmails = labelMails;
                        updatePagination(1, labelMails);
                    } else {
                        emails.setValue(new ArrayList<>());
                        totalPages.setValue(1);
                        hasNextPage.setValue(false);
                        hasPreviousPage.setValue(false);
                    }

                    System.out.println("emails.setValue() called for label: " + labelName);
                } else {
                    System.out.println("Response error or null body for label: " + labelName);
                    error.setValue("Error loading emails for " + displayName);
                }
                System.out.println("===========================");
            }

            @Override
            public void onFailure(Call<EmailAPI.MailsByLabelResponse> call, Throwable t) {
                isLoading.setValue(false);
                System.err.println("Network error loading emails by label: " + t.getMessage());
                error.setValue("Network error loading " + displayName);
            }
        });
    }

    // Convenience functions for special filters - they will also get pagination
    public void loadStarredEmails() {
        currentPage = 1;
        isLoading.setValue(true);
        error.setValue(null);
        currentFilter.setValue("starred");
        currentFilterDisplayName.setValue("Starred");

        repository.getStarredEmails().enqueue(new Callback<EmailAPI.MailsByLabelResponse>() {
            @Override
            public void onResponse(Call<EmailAPI.MailsByLabelResponse> call, Response<EmailAPI.MailsByLabelResponse> response) {
                isLoading.setValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    allEmails = response.body().mails;
                    updatePagination(1, allEmails);
                } else {
                    error.setValue("Error loading starred emails");
                }
            }

            @Override
            public void onFailure(Call<EmailAPI.MailsByLabelResponse> call, Throwable t) {
                isLoading.setValue(false);
                error.setValue("Network error");
            }
        });
    }

    public void loadSpamEmails() {
        currentPage = 1;
        isLoading.setValue(true);
        error.setValue(null);
        currentFilter.setValue("spam");
        currentFilterDisplayName.setValue("Spam");

        repository.getSpamEmails().enqueue(new Callback<EmailAPI.MailsByLabelResponse>() {
            @Override
            public void onResponse(Call<EmailAPI.MailsByLabelResponse> call, Response<EmailAPI.MailsByLabelResponse> response) {
                isLoading.setValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    allEmails = response.body().mails;
                    updatePagination(1, allEmails);
                } else {
                    error.setValue("Error loading spam emails");
                }
            }

            @Override
            public void onFailure(Call<EmailAPI.MailsByLabelResponse> call, Throwable t) {
                isLoading.setValue(false);
                error.setValue("Network error");
            }
        });
    }

    // Refresh current filter
    public void refreshCurrentFilter() {
        String filter = currentFilter.getValue();
        if (filter == null || filter.equals("inbox")) {
            loadEmailsPage(currentPage); // Keep current page
        } else if (filter.equals("starred")) {
            loadStarredEmails();
        } else if (filter.equals("spam")) {
            loadSpamEmails();
        } else {
            loadEmailsByLabel(filter, currentFilterDisplayName.getValue());
        }
    }

    // === Rest of the functions remain exactly as they were ===

    public void moveToTrash(String emailId, SimpleCallback callback) {
        System.out.println("=== MOVING EMAIL TO TRASH ===");
        System.out.println("Email ID: " + emailId);

        com.example.gmailapplication.shared.UpdateLabelsRequest request =
                new com.example.gmailapplication.shared.UpdateLabelsRequest(
                        java.util.Arrays.asList("trash"));

        emailAPI.updateEmailLabels(emailId, request).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                System.out.println("=== MOVE TO TRASH RESPONSE ===");
                System.out.println("Response code: " + response.code());
                System.out.println("Response successful: " + response.isSuccessful());

                boolean success = response.isSuccessful();
                if (callback != null) {
                    callback.onResult(success);
                }
                System.out.println("=============================");
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                System.err.println("=== MOVE TO TRASH FAILURE ===");
                System.err.println("Error: " + t.getMessage());
                if (callback != null) {
                    callback.onResult(false);
                }
                System.err.println("=============================");
            }
        });
    }

    public void deleteEmail(String emailId, SimpleCallback callback) {
        System.out.println("=== DELETING EMAIL PERMANENTLY ===");
        System.out.println("Email ID: " + emailId);

        emailAPI.deleteEmailPermanently(emailId).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                System.out.println("=== DELETE EMAIL PERMANENTLY RESPONSE ===");
                System.out.println("Response code: " + response.code());
                System.out.println("Response successful: " + response.isSuccessful());

                boolean success = response.isSuccessful();
                if (success) {
                    refreshCurrentFilter();
                }

                if (callback != null) {
                    callback.onResult(success);
                }
                System.out.println("=====================================");
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                System.err.println("=== DELETE EMAIL PERMANENTLY FAILURE ===");
                System.err.println("Error: " + t.getMessage());
                if (callback != null) {
                    callback.onResult(false);
                }
                System.err.println("=====================================");
            }
        });
    }

    public void toggleStar(String emailId, SimpleCallback callback) {
        System.out.println("=== TOGGLING STAR ===");
        System.out.println("Email ID: " + emailId);

        emailAPI.toggleStarEmail(emailId).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                System.out.println("=== TOGGLE STAR RESPONSE ===");
                System.out.println("Response code: " + response.code());
                System.out.println("Response successful: " + response.isSuccessful());

                boolean success = response.isSuccessful();
                if (callback != null) {
                    callback.onResult(success);
                }
                System.out.println("===========================");
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                System.err.println("=== TOGGLE STAR FAILURE ===");
                System.err.println("Error: " + t.getMessage());
                if (callback != null) {
                    callback.onResult(false);
                }
                System.err.println("==========================");
            }
        });
    }

    public void searchEmails(String query) {
        if (query == null || query.trim().isEmpty()) {
            searchResults.setValue(null);
            return;
        }

        isSearching.setValue(true);
        error.setValue(null);

        emailAPI.searchEmails(query.trim()).enqueue(new Callback<List<Email>>() {
            @Override
            public void onResponse(Call<List<Email>> call, Response<List<Email>> response) {
                isSearching.setValue(false);

                System.out.println("=== SEARCH DEBUG ===");
                System.out.println("Response code: " + response.code());
                System.out.println("Response successful: " + response.isSuccessful());
                System.out.println("Response body null: " + (response.body() == null));
                if (response.body() != null) {
                    System.out.println("Response body size: " + response.body().size());
                }
                System.out.println("===================");
                if (response.isSuccessful()) {
                    if (response.body() != null && !response.body().isEmpty()) {
                        searchResults.setValue(response.body());
                    } else {
                        error.setValue("No matches found for your search");
                        searchResults.setValue(new ArrayList<>());
                    }
                } else if (response.code() == 404) {
                    error.setValue("No matches found for your search");
                    searchResults.setValue(new ArrayList<>());
                } else {
                    error.setValue("Search error");
                    searchResults.setValue(null);
                }
            }

            @Override
            public void onFailure(Call<List<Email>> call, Throwable t) {
                isSearching.setValue(false);
                error.setValue("Network error in search");
                searchResults.setValue(null);
            }
        });
    }

    public void clearSearch() {
        searchResults.setValue(null);
    }

    public LiveData<List<Email>> getRoomEmails() {
        System.out.println("=== ROOM: getRoomEmails() called ===");
        System.out.println("roomEmails is null: " + (roomEmails == null));
        if (roomEmails != null) {
            System.out.println("roomEmails type: " + roomEmails.getClass().getSimpleName());
        }
        return roomEmails;
    }
}