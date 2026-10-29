import { useNavigation, useSelect } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { CATEGORIES_SELECT_QUERY, POST_CREATE_MUTATION } from "./queries";

export const BlogPostCreate = () => {
  const { list } = useNavigation();

  const {
    refineCore: { onFinish },
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    refineCoreProps: {
      meta: {
        gqlMutation: POST_CREATE_MUTATION,
      },
    },
  });

  const { options: categoryOptions } = useSelect({
    resource: "categories",
    meta: {
      gqlQuery: CATEGORIES_SELECT_QUERY,
    },
  });

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Create</h1>
        <div>
          <button
            onClick={() => {
              list("blog_posts");
            }}
          >
            List
          </button>
        </div>
      </div>
      <form onSubmit={handleSubmit(onFinish)}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <label>
            <span style={{ marginRight: "8px" }}>title</span>
            <input
              type="text"
              {...register("title", {
                required: "This field is required",
              })}
            />
            <span style={{ color: "red" }}>
              {(errors as any)?.title?.message as string}
            </span>
          </label>
          <label>
            <span style={{ marginRight: "8px" }}>Content</span>
            <textarea
              rows={5}
              cols={33}
              style={{ verticalAlign: "top" }}
              {...register("content", {
                required: "This field is required",
              })}
            />
            <span style={{ color: "red" }}>
              {(errors as any)?.content?.message as string}
            </span>
          </label>
          <label>
            <span style={{ marginRight: "8px" }}>Category</span>
            <select
              {...register("categoryId", {
                required: "This field is required",
              })}
            >
              {categoryOptions?.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span style={{ color: "red" }}>
              {(errors as any)?.category?.id?.message as string}
            </span>
          </label>
          <label>
            <span style={{ marginRight: "8px" }}>Status</span>
            <select
              defaultValue={"DRAFT"}
              {...register("status", {
                required: "This field is required",
              })}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <span style={{ color: "red" }}>
              {(errors as any)?.status?.message as string}
            </span>
          </label>
          <div>
            <input type="submit" value="save" />
          </div>
        </div>
      </form>
    </div>
  );
};
